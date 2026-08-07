import { supabase } from '../lib/supabaseClient';
import { CAMPUS_SLUG } from '../config/policy';
import { snapToGrid } from '../lib/geo';

// 로드맵 §2.2 — 게스트와 로그인 사용자가 서로 다른 뷰를 읽는다.
//   게스트  : cats_guest  (대표사진·이름·특이사항·최근밥·좌표만)
//   로그인  : cats_full   (전체)
// 컬럼 차단은 DB 에서 한다. 화면에서 숨기는 게 아니다.

export async function fetchCampus(slug = CAMPUS_SLUG) {
  const { data, error } = await supabase
    .from('campuses').select('*').eq('slug', slug).single();
  if (error) throw error;
  return data;
}

/** 지도 화면. 로그인 여부에 따라 읽는 뷰가 달라진다. */
export async function fetchCatsForMap(loggedIn) {
  const view = loggedIn ? 'cats_full' : 'cats_guest';
  const { data, error } = await supabase
    .from(view).select('*').order('name');
  if (error) throw error;
  return data;
}

/**
 * 상세 페이지. 로그인 전용 — 게스트는 RLS 에서 막힌다.
 * "다른 사진들" 갤러리는 사진이 붙은 목격 기록에서 나온다.
 */
export async function fetchCatDetail(catId) {
  const [cat, photos, feedings] = await Promise.all([
    supabase.from('cats_full').select('*').eq('id', catId).single(),
    supabase.from('sightings')
      .select('id, photo_path, created_at')
      .eq('cat_id', catId).not('photo_path', 'is', null)
      .order('created_at', { ascending: false }).limit(8),
    supabase.from('feedings')
      .select('id, kind, fed_at, giver_id')          // ★ 누가 줬는지 (§2.8-14)
      .eq('cat_id', catId)
      .order('fed_at', { ascending: false }).limit(10),
  ]);

  if (cat.error) throw cat.error;
  const feeds = feedings.data ?? [];

  // ★ 밥 준 사람 닉네임을 profiles 에서 채운다.
  //   로그인 사용자는 모든 profiles 를 읽을 수 있다 (§2.8-14, profiles_select_authed).
  //   FK 임베드에 기대지 않고 id → nickname 별도 조회로 매핑한다.
  const giverIds = [...new Set(feeds.map((f) => f.giver_id).filter(Boolean))];
  let nameById = {};
  if (giverIds.length) {
    const { data: people } = await supabase
      .from('profiles').select('id, nickname').in('id', giverIds);
    nameById = Object.fromEntries((people ?? []).map((p) => [p.id, p.nickname]));
  }
  const feedingsWithGiver = feeds.map((f) => ({ ...f, giver: nameById[f.giver_id] ?? null }));

  return { ...cat.data, photos: photos.data ?? [], feedings: feedingsWithGiver };
}

/**
 * 고양이 신규 등록 (§2.11 · §2.8-12 — 로그인 사용자 누구나).
 *   1) cats 행을 만들고  2) 방금 만든 개체에 첫 목격(위치)을 붙인다.
 * 위치는 저장 직전 50m 격자로 반올림된다 (§2.3, lib/geo.snapToGrid).
 *
 * ⚠️ 두 INSERT 는 트랜잭션이 아니다. sightings 가 실패하면 위치 없는 개체가 남는다(v1 감수).
 * ⚠️ 방금 넣은 목격은 1시간 지연 때문에 뷰에서 last_lat 이 NULL 로 온다 —
 *    등록 직후 지도에 핀이 안 뜨는 건 정상이다 (§2.3). 카운터(도감 N마리)는 바로 오른다.
 */
export async function createCat({ coverPath, name, description, color, sex, neutered, lat, lng }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('LOGIN_REQUIRED');

  // 1) 개체 행. id·code·created_at·status 는 DB 기본값/트리거가 채운다 (§2.11)
  const { data: cat, error } = await supabase.from('cats').insert({
    cover_path: coverPath,
    name: name.trim(),
    description: description?.trim() || null,  // 빈 서술은 NULL
    color,                                     // 슬러그. CHECK 제약이 값을 검증한다
    sex,                                       // male | female | unknown
    neutered,                                  // true | false | null(모름)
    created_by: user.id,
    campus_id: null,                           // §2.5 — v1 미사용
  }).select('id').single();
  if (error) throw error;

  // 2) 첫 목격 = 위치. 저장 직전 50m 라운딩 (§2.3)
  const snapped = snapToGrid({ lat, lng });
  const { error: sightErr } = await supabase.from('sightings').insert({
    cat_id: cat.id,
    lat: snapped.lat,
    lng: snapped.lng,
    reporter_id: user.id,
    photo_path: null,
  });
  // ⚠️ .select() 를 붙이지 않는다 — sightings 의 1시간 지연 SELECT RLS 가
  //    방금 넣은 행을 가려 read-back 이 0행으로 실패한다 (addSighting 을 재사용 못 하는 이유).
  if (sightErr) throw sightErr;

  return cat.id;
}

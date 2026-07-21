import { supabase } from '../lib/supabaseClient';
import { CAMPUS_SLUG } from '../config/policy';

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
      .select('id, kind, fed_at')
      .eq('cat_id', catId)
      .order('fed_at', { ascending: false }).limit(10),
  ]);

  if (cat.error) throw cat.error;
  return { ...cat.data, photos: photos.data ?? [], feedings: feedings.data ?? [] };
}

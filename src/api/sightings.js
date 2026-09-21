import { supabase } from '../lib/supabaseClient';
import { snapToGrid } from '../lib/geo';

/**
 * §2.19 관측시각 — INSERT payload 에 얹을 seen_at 조각.
 *   값이 없으면 빈 객체를 돌려줘 **키 자체가 빠진다** → DB default now() 가 채운다.
 *   ⚠️ 클라이언트에서 now() 를 계산해 넣지 않는다. 시계가 서버보다 조금이라도 빠르면
 *      CHECK(seen_at <= created_at) 에 걸려 INSERT 가 통째로 실패한다.
 *   sightings INSERT 경로가 둘(여기 · api/cats.js createCat)이라 조각을 한곳에 둔다.
 */
export function seenAtPatch(seenAt) {
  if (!seenAt) return {};
  const t = new Date(seenAt);
  if (Number.isNaN(t.getTime())) throw new Error('INVALID_SEEN_AT');
  return { seen_at: t.toISOString() };
}

/**
 * 목격 등록 (§2.3). 넘어온 lat/lng 은 여기서 50m 격자로 반올림된 뒤 저장된다.
 * created_at 은 DB default(클라이언트 시계를 안 믿는다) — 1시간 지연 기준은 계속 created_at 이다.
 * seenAt 은 사용자가 「언제 봤나요?」를 직접 바꿨을 때만 넘어온다 (§2.19).
 *
 * ⚠️ read-back 을 하지 않는다 — sightings 의 SELECT 정책엔 1시간 지연이 상시 걸려 있어
 * 방금 넣은 행은 항상 0행으로 돌아온다(§2.3, 비협상). createCat 이 자체 sightings INSERT 에서
 * 같은 이유로 .select() 를 안 붙이는 것과 동일 (api/cats.js). INSERT 성공 여부만 본다.
 */
export async function addSighting({ catId, lat, lng, photoPath = null, note = null, seenAt = null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('LOGIN_REQUIRED');

  const snapped = snapToGrid({ lat, lng });
  const { error } = await supabase.from('sightings').insert({
    cat_id: catId,
    lat: snapped.lat,
    lng: snapped.lng,
    reporter_id: user.id,
    photo_path: photoPath,
    note: note?.trim() ? note.trim() : null,
    ...seenAtPatch(seenAt),
  });
  if (error) throw error;
}

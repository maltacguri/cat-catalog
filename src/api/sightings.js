import { supabase } from '../lib/supabaseClient';
import { snapToGrid } from '../lib/geo';

/**
 * 목격 등록 (§2.3). 넘어온 lat/lng 은 여기서 50m 격자로 반올림된 뒤 저장된다.
 * created_at 은 DB default(클라이언트 시계를 안 믿는다).
 *
 * ⚠️ read-back 을 하지 않는다 — sightings 의 SELECT 정책엔 1시간 지연이 상시 걸려 있어
 * 방금 넣은 행은 항상 0행으로 돌아온다(§2.3, 비협상). createCat 이 자체 sightings INSERT 에서
 * 같은 이유로 .select() 를 안 붙이는 것과 동일 (api/cats.js). INSERT 성공 여부만 본다.
 */
export async function addSighting({ catId, lat, lng, photoPath = null, note = null }) {
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
  });
  if (error) throw error;
}

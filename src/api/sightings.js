import { supabase } from '../lib/supabaseClient';
import { uploadSightingPhoto } from './photos';
import { snapToGrid } from '../lib/geo';

/**
 * 목격 등록 (로드맵 §2.3).
 * 넘어온 lat/lng 은 여기서 50m 격자로 반올림된 뒤 저장된다.
 * 호출부가 정밀 좌표를 넘겨도 DB 에는 반올림된 값만 들어간다.
 */
export async function addSighting({ catId, lat, lng, file }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('LOGIN_REQUIRED');

  const snapped = snapToGrid({ lat, lng });

  let photoPath = null;
  if (file) photoPath = (await uploadSightingPhoto(file, { catId })).path;

  const { data, error } = await supabase.from('sightings').insert({
    cat_id: catId,
    lat: snapped.lat,
    lng: snapped.lng,
    reporter_id: user.id,
    photo_path: photoPath,
  }).select().single();

  // 참고: RLS 때문에 방금 넣은 행은 1시간이 지나기 전엔 다시 못 읽는다.
  // 화면에서는 COPY.sightingSaved 로 안내할 것.
  if (error) throw error;
  return data;
}

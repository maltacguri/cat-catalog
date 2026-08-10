import { supabase } from '../lib/supabaseClient';

/**
 * 회원 탈퇴 요청 — INSERT까지만 한다. 실제 탈퇴(auth.users 삭제)는 대시보드에서 수동으로 처리한다.
 * user_id 부분 unique 인덱스(status='pending')가 중복 요청을 막는다 — 23505는 "이미 요청됨"으로 구분한다.
 * 이 테이블 SELECT 정책엔 지연 조건이 없으므로 read-back을 붙여도 된다(sightings와 다른 케이스).
 */
export async function requestDeletion(note) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('LOGIN_REQUIRED');

  const { data, error } = await supabase.from('deletion_requests')
    .insert({ user_id: user.id, note: note?.trim() || null })
    .select().single();

  if (error) {
    if (error.code === '23505') throw new Error('ALREADY_REQUESTED');
    throw error;
  }
  return data;
}

/** 내 대기 중(pending) 탈퇴 요청 1건. 없으면 null. */
export async function fetchMyDeletionRequest() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from('deletion_requests')
    .select('id, created_at, status')
    .eq('user_id', user.id).eq('status', 'pending')
    .maybeSingle();
  if (error) throw error;
  return data;
}

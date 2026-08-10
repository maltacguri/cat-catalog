import { supabase } from '../lib/supabaseClient';

/**
 * 닉네임 변경 (§2.8-14) — profiles는 authenticated에게 nickname 컬럼 UPDATE만 허용된다.
 * 다른 컬럼을 같이 넘기면 권한 거부가 나므로 nickname 하나만 보낸다. 중복 닉네임은 허용(UNIQUE 없음).
 */
export async function updateNickname(nickname) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('LOGIN_REQUIRED');

  const trimmed = (nickname ?? '').trim();
  if (!trimmed) throw new Error('닉네임을 입력해 주세요.');
  if (trimmed.length < 2 || trimmed.length > 12) {
    throw new Error('닉네임은 2~12자로 입력해 주세요.');
  }

  const { error } = await supabase.from('profiles')
    .update({ nickname: trimmed }).eq('id', user.id);
  if (error) throw error;
  return trimmed;
}

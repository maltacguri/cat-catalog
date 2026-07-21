// ============================================================
// 인증 — 로드맵 §2.1
//
//   이메일 : OTP 인증 1회 → 비밀번호 설정 → 이후 비밀번호로 로그인
//   카카오 : 카카오 인증으로 계속 로그인
//
//   두 방식 모두 가입 시 앱 자체 프로필이 생기고,
//   집사 이름은 DB 트리거가 무작위로 만든다 (random_nickname()).
//   카카오 닉네임·프로필 사진은 저장하지도 그리지도 않는다.
//
//   대학 이메일 도메인 제한 없음.
// ============================================================

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// ---------- 이메일: 가입 (OTP 1회) ----------

/** 1단계. 6자리 코드를 메일로 보낸다. */
export async function sendSignupCode(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true,
      emailRedirectTo: window.location.origin, },
    
  });
  if (error) throw error;
}

/** 2단계. 받은 코드를 확인한다. 성공하면 로그인 상태가 된다. */
export async function verifySignupCode(email, token) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

/** 3단계. 비밀번호를 설정한다. 이후로는 OTP 없이 이걸로 로그인. */
export async function setPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

// ---------- 이메일: 이후 로그인 ----------

export async function signInWithPassword(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// ---------- 카카오 ----------

/**
 * ⚠️ 먼저 해둘 것 (Phase B):
 *   1. 카카오 개발자센터에서 앱 생성 → REST API 키 발급
 *   2. 카카오 로그인 활성화 + Redirect URI 에
 *      https://<프로젝트>.supabase.co/auth/v1/callback 등록
 *   3. Supabase → Authentication → Providers → Kakao 에 키 입력
 *   이 셋 중 하나라도 빠지면 리다이렉트에서 막힌다.
 */
export async function signInWithKakao() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo: window.location.origin ,
                   scopes: 'profile_nickname profile_image'},
    
  });
  if (error) throw error;
}

// ---------- 공통 ----------

export async function signOut() {
  await supabase.auth.signOut();
}

export async function fetchMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, role, campus_id')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return data;
}

export function useSession() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, ready, loggedIn: !!session };
}

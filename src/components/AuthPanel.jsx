import { useEffect, useState } from 'react';
import {
  sendSignupCode, verifySignupCode, setPassword,
  signInWithPassword, signInWithKakao, signOut, fetchMyProfile,
} from '../api/auth';

/**
 * 인증 — 로드맵 §2.1
 *
 *   이메일 : 가입 시 OTP 1회 → 비밀번호 설정 → 이후 비밀번호 로그인
 *   카카오 : 계속 카카오 인증
 *
 * 집사 이름은 화면에서 입력받지 않는다. DB 트리거가 무작위로 만든다.
 */
export default function AuthPanel({ session, onClose }) {
  const [step, setStep] = useState('login'); // login | code | password
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (session) fetchMyProfile().then(setProfile).catch(() => {});
  }, [session]);

  async function run(fn, next, okMsg) {
    setBusy(true);
    setMsg('');
    try {
      await fn();
      if (next) setStep(next);
      if (okMsg) setMsg(okMsg);
    } catch (e) {
      setMsg(errorKo(e));
    } finally {
      setBusy(false);
    }
  }

  if (session) {
    return (
      <div className="auth-panel">
        <div className="auth-row">
          <span><b>{profile?.nickname ?? '집사'}</b>님으로 로그인됨</span>
          <button className="btn-ghost" onClick={signOut}>로그아웃</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-panel">
      <div className="auth-head">
        <b>로그인</b>
        {onClose && <button className="btn-ghost" onClick={onClose}>닫기</button>}
      </div>

      {step === 'login' && (
        <>
          <input type="email" placeholder="이메일" value={email}
                 onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="비밀번호" value={pw}
                 onChange={(e) => setPw(e.target.value)} />
          <button className="btn-primary" disabled={busy}
                  onClick={() => run(() => signInWithPassword(email, pw))}>
            로그인
          </button>

          <div className="auth-sep">처음이신가요?</div>
          <button className="btn-line" disabled={busy || !email}
                  onClick={() => run(() => sendSignupCode(email), 'code',
                                     '메일로 6자리 코드를 보냈어요.')}>
            이메일로 가입 (인증번호 받기)
          </button>
          <button className="btn-kakao" disabled={busy} onClick={() => run(signInWithKakao)}>
            카카오로 시작하기
          </button>
        </>
      )}

      {step === 'code' && (
        <>
          <p className="auth-hint">{email} 으로 보낸 6자리 코드를 입력해 주세요.</p>
          <input inputMode="numeric" placeholder="인증번호 6자리" value={code}
                 onChange={(e) => setCode(e.target.value)} />
          <button className="btn-primary" disabled={busy}
                  onClick={() => run(() => verifySignupCode(email, code), 'password')}>
            확인
          </button>
          <button className="btn-ghost" onClick={() => setStep('login')}>뒤로</button>
        </>
      )}

      {step === 'password' && (
        <>
          <p className="auth-hint">
            비밀번호를 설정하면 다음부터는 인증번호 없이 로그인할 수 있어요.
          </p>
          <input type="password" placeholder="비밀번호 (6자 이상)" value={pw}
                 onChange={(e) => setPw(e.target.value)} />
          <button className="btn-primary" disabled={busy || pw.length < 6}
                  onClick={() => run(() => setPassword(pw), 'login', '가입이 끝났어요.')}>
            비밀번호 설정하고 시작하기
          </button>
        </>
      )}

      {msg && <p className="auth-msg">{msg}</p>}
    </div>
  );
}

function errorKo(e) {
  const m = String(e?.message ?? '');
  if (m.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않아요.';
  if (m.includes('Token has expired') || m.includes('invalid'))
    return '인증번호가 만료됐거나 맞지 않아요. 다시 받아 주세요.';
  if (m.includes('rate limit') || m.includes('Email rate'))
    return '메일을 너무 자주 보냈어요. 잠시 후 다시 시도해 주세요.';
  if (m.includes('provider is not enabled'))
    return '카카오 로그인이 아직 설정되지 않았어요. (Supabase Provider 설정 필요)';
  return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
}

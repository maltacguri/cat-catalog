import { useEffect, useState } from 'react';
import {
  signUpWithEmail, resendSignupEmail,
  signInWithPassword, signInWithKakao, signOut, fetchMyProfile,
} from '../api/auth';

/**
 * 인증 — 로드맵 §2.1
 *
 *   이메일 : 가입 폼(이메일+비밀번호) → 확인 메일 링크 클릭 → 이후 비밀번호 로그인
 *   카카오 : 계속 카카오 인증
 *
 * 집사 이름은 화면에서 입력받지 않는다. DB 트리거가 무작위로 만든다.
 */
export default function AuthPanel({ session, onClose }) {
  const [step, setStep] = useState('login'); // login | signup | sent
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
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
        <b>{step === 'signup' ? '회원가입' : '로그인'}</b>
        {onClose && <button className="btn-ghost" onClick={onClose}>닫기</button>}
      </div>

      {step === 'login' && (
        <>
          <label className="auth-label" htmlFor="login-email">이메일 주소</label>
          <input id="login-email" type="email" value={email}
                 onChange={(e) => setEmail(e.target.value)} />

          <label className="auth-label" htmlFor="login-pw">비밀번호</label>
          <input id="login-pw" type="password" value={pw}
                 onChange={(e) => setPw(e.target.value)} />
          <button className="btn-primary" disabled={busy}
                  onClick={() => run(() => signInWithPassword(email, pw))}>
            로그인
          </button>

          <div className="auth-sep">처음이신가요?</div>
          <button className="btn-kakao" disabled={busy} onClick={() => run(signInWithKakao)}>
            카카오로 시작하기
          </button>
          <button className="btn-line" disabled={busy}
                  onClick={() => { setMsg(''); setStep('signup'); }}>
            이메일로 가입하기
          </button>
    
        </>
      )}

      {step === 'signup' && (
        <>
          <label className="auth-label" htmlFor="signup-email">이메일 주소</label>
          <input id="signup-email" type="email" value={email}
                 onChange={(e) => setEmail(e.target.value)} />

          <label className="auth-label" htmlFor="signup-pw">비밀번호</label>
          <input id="signup-pw" type="password" value={pw}
                 onChange={(e) => setPw(e.target.value)} />

          <label className="auth-label" htmlFor="signup-pw2">비밀번호 확인</label>
          <input id="signup-pw2" type="password" value={pw2}
                 onChange={(e) => setPw2(e.target.value)} />

          <button
            className="btn-primary" disabled={busy || !email || pw.length < 6 || !pw2}
            onClick={() => {
              if (pw !== pw2) { setMsg('비밀번호가 서로 달라요'); return; }
              run(() => signUpWithEmail(email, pw), 'sent');
            }}
          >
            가입하기
          </button>
          {(!email || pw.length < 6 || !pw2) && (
            <p className="auth-hint">이메일과 비밀번호(6자 이상), 비밀번호 확인을 모두 입력해 주세요</p>
          )}
          <button className="btn-ghost" onClick={() => { setMsg(''); setStep('login'); }}>뒤로</button>
        </>
      )}

      {step === 'sent' && (
        <>
          <p className="auth-hint">
            {email} 로 확인 메일을 보냈어요.<br />
            메일의 링크를 눌러주세요. 확인이 끝나면 아래 버튼을 눌러 로그인하세요.
          </p>
          <button className="btn-primary" disabled={busy}
                  onClick={() => run(() => signInWithPassword(email, pw))}>
            인증 완료했어요
          </button>
          <button className="btn-line" disabled={busy}
                  onClick={() => run(() => resendSignupEmail(email), null, '메일을 다시 보냈어요.')}>
            메일 다시 보내기
          </button>
        </>
      )}

      {msg && <p className="auth-msg">{msg}</p>}
    </div>
  );
}

function errorKo(e) {
  const m = String(e?.message ?? '');
  if (m.includes('Unable to validate email address')) return '이메일 주소 형식을 확인해 주세요.';
  if (m.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않아요.';
  if (m.includes('Email not confirmed'))
    return '아직 메일 확인이 안 됐어요. 메일함의 링크를 눌러주세요.';
  if (m.includes('Password should be at least'))
    return '비밀번호는 6자 이상이어야 해요.';
  if (m.includes('For security purposes'))
    return '잠시 후에 다시 시도해 주세요.';
  if (m.includes('rate limit') || m.includes('Email rate'))
    return '메일을 너무 자주 보냈어요. 잠시 후 다시 시도해 주세요.';
  if (m.includes('provider is not enabled'))
    return '카카오 로그인이 아직 설정되지 않았어요. (Supabase Provider 설정 필요)';
  return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
}

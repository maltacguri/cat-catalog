// 집사 프로필 — 급식 카운터 3종만 (§2.8-15). 로그아웃·설정·프로필 편집은 범위 밖.
import { useEffect, useState } from 'react';
import { useSession, fetchMyProfile } from '../api/auth';
import { useAppUI } from '../components/AppUI';
import { fetchMyFeedCounts } from '../api/feedings';
import { KIND_ORDER, KIND_KO } from '../lib/format';

export default function MePage() {
  const { loggedIn } = useSession();
  const { openAuth } = useAppUI();

  const [nickname, setNickname] = useState(null);
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loggedIn) return;
    let alive = true;
    Promise.all([fetchMyProfile(), fetchMyFeedCounts()])
      .then(([profile, c]) => {
        if (!alive) return;
        setNickname(profile?.nickname ?? null);
        setCounts(c);
      })
      .catch((e) => { if (alive) setError(e.message || String(e)); });
    return () => { alive = false; };
  }, [loggedIn]);

  // /me 는 잠금 탭이지만 주소창 직접 입력을 막는 라우트 가드가 없어서 여기서 한 번 더 막는다
  if (!loggedIn) {
    return (
      <div className="me-gate">
        <p>집사 프로필은 로그인해야 볼 수 있어요.</p>
        <button className="me-login" onClick={() => openAuth()}>로그인하기</button>
      </div>
    );
  }

  return (
    <div className="me">
      <div className="me-nickname">{nickname ?? '—'}</div>
      {error ? (
        <p className="me-error">불러오지 못했어요: {error}</p>
      ) : (
        <div className="me-counts">
          {KIND_ORDER.map((k) => (
            <div className="me-count" key={k}>
              <div className="me-count-label">{KIND_KO[k]}</div>
              <div className="me-count-value">{counts ? counts[k] : '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

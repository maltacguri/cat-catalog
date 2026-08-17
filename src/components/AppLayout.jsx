// .phone 프레임과 하단 바, 로그인 시트를 여기서 들고 있는다.
// MapPage에 있던 .phone 래퍼와 시트를 여기로 올렸다.
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';

import { fetchMyProfile, useSession } from '../api/auth';
import { useAppUI } from './AppUI';
import AuthPanel from './AuthPanel';
import BottomBar from './BottomBar';
import CatDetailPage from './CatDetailPage';
import HomeGuideOverlay from './HomeGuideOverlay';
import PledgeOverlay from './PledgeOverlay';

export default function AppLayout() {
  const { session } = useSession();
  const { authOpen, authLead, closeAuth, detailId, closeDetail } = useAppUI();
  const [searchParams, setSearchParams] = useSearchParams();
  const showWelcome = searchParams.has('welcome');
  const { pathname } = useLocation();
  const [profile, setProfile] = useState(null);

  useEffect(() => { closeDetail(); }, [pathname]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    fetchMyProfile().then(setProfile).catch((e) => console.error(e));
  }, [session]);

  // 오버레이 우선순위 — 한 번에 하나만 뜬다 (1: 서약서 > 2: welcome > 3: 사용법)
  const needPledge = !!session && profile !== null && profile.onboarded_at === null;
  const needWelcome = !needPledge && showWelcome;
  const needHomeGuide = !needPledge && !needWelcome
    && !!session && profile !== null && profile.home_guide_seen_at === null
    && pathname === '/';

  function closeWelcome() {
    const next = new URLSearchParams(searchParams);
    next.delete('welcome');
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="phone">
      <Outlet />
      <BottomBar />
      <CatDetailPage catId={detailId} onClose={closeDetail} />

      {authOpen && (
        <div className="sheet-backdrop" onClick={closeAuth}>
          <div onClick={(e) => e.stopPropagation()}>
            {authLead && <p className="auth-lead">{authLead}</p>}
            <AuthPanel session={session} onClose={closeAuth} />
          </div>
        </div>
      )}

      {needPledge && (
        <PledgeOverlay
          onDone={() => setProfile((p) => ({ ...p, onboarded_at: new Date().toISOString() }))}
        />
      )}

      {needWelcome && (
        <div className="sheet-backdrop">
          <div className="welcome-panel">
            <b className="welcome-title">가입이 끝났어요!</b>
            <p className="welcome-msg">
              원래 보던 화면으로 돌아가면 자동으로 로그인돼요.<br />
              이 창에서 바로 시작해도 됩니다.
            </p>
            <button className="btn-primary" onClick={closeWelcome}>시작하기</button>
          </div>
        </div>
      )}

      {needHomeGuide && (
        <HomeGuideOverlay
          onDone={() => setProfile((p) => ({ ...p, home_guide_seen_at: new Date().toISOString() }))}
        />
      )}
    </div>
  );
}
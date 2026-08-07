// .phone 프레임과 하단 바, 로그인 시트를 여기서 들고 있는다.
// MapPage에 있던 .phone 래퍼와 시트를 여기로 올렸다.
import { useEffect } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';

import { useSession } from '../api/auth';
import { useAppUI } from './AppUI';
import AuthPanel from './AuthPanel';
import BottomBar from './BottomBar';
import CatDetailPage from './CatDetailPage';

export default function AppLayout() {
  const { session } = useSession();
  const { authOpen, authLead, closeAuth, detailId, closeDetail } = useAppUI();
  const [searchParams, setSearchParams] = useSearchParams();
  const showWelcome = searchParams.has('welcome');
  const { pathname } = useLocation();

  useEffect(() => { closeDetail(); }, [pathname]);   // eslint-disable-line react-hooks/exhaustive-deps

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

      {showWelcome && (
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
    </div>
  );
}
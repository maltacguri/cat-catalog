// .phone 프레임과 하단 바, 로그인 시트를 여기서 들고 있는다.
// MapPage에 있던 .phone 래퍼와 시트를 여기로 올렸다.
import { Outlet } from 'react-router-dom';

import { useSession } from '../api/auth';
import { useAppUI } from './AppUI';
import AuthPanel from './AuthPanel';
import BottomBar from './BottomBar';

export default function AppLayout() {
  const { session } = useSession();
  const { authOpen, authLead, closeAuth } = useAppUI();

  return (
    <div className="phone">
      <Outlet />
      <BottomBar />

      {authOpen && (
        <div className="sheet-backdrop" onClick={closeAuth}>
          <div onClick={(e) => e.stopPropagation()}>
            {authLead && <p className="auth-lead">{authLead}</p>}
            <AuthPanel session={session} onClose={closeAuth} />
          </div>
        </div>
      )}
    </div>
  );
}
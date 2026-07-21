// 탭 4개 (앱플로우 §6). 게스트에게도 전부 보이고 3개는 잠금 (§2.2)
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Bookmark, User, Lock } from 'lucide-react';

import { useSession } from '../api/auth';
import { useAppUI } from './AppUI';
import { COPY } from '../lib/format';

const TABS = [
  { to: '/',       label: '홈',     Icon: Home,     auth: false },
  { to: '/nearby', label: '주변',   Icon: Search,   auth: true  },
  { to: '/mycat',  label: '마이캣', Icon: Bookmark, auth: true  },
  { to: '/me',     label: '집사',   Icon: User,     auth: true  },
];

export default function BottomBar() {
  const { loggedIn } = useSession();
  const { barHidden, openAuth } = useAppUI();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function go(tab) {
    // §2.2 — 잠긴 탭은 화면 전환을 하지 않는다. 로그인 유도만 띄우고 제자리
    if (tab.auth && !loggedIn) { openAuth(COPY.tabLocked); return; }
    navigate(tab.to);
  }

  return (
    <nav className={`bottombar ${barHidden ? 'is-hidden' : ''}`}>
      {TABS.map((t) => {
        const active = pathname === t.to;
        const locked = t.auth && !loggedIn;
        return (
          <button
            key={t.to}
            type="button"
            aria-label={t.label}
            className={`bb-tab ${active ? 'is-active' : ''} ${locked ? 'is-locked' : ''}`}
            onClick={() => go(t)}
          >
            <span className="bb-icon">
              <t.Icon size={22} strokeWidth={active ? 2.2 : 1.7} />
              {locked && <Lock className="bb-lock" size={11} strokeWidth={2.6} />}
            </span>
            <span className="bb-label">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
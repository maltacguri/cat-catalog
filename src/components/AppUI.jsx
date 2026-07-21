// 하단 바 표시 여부 + 로그인 시트를 앱 전역에서 공유한다.
// 카드는 MapPage가, 바는 AppLayout이 들고 있어서 상태를 올릴 곳이 필요했다.
import { createContext, useContext, useMemo, useState } from 'react';

const Ctx = createContext(null);

export function AppUIProvider({ children }) {
  const [barHidden, setBarHidden] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authLead, setAuthLead] = useState(null);

  const value = useMemo(() => ({
    barHidden,
    setBarHidden,
    authOpen,
    authLead,
    openAuth: (lead) => { setAuthLead(lead ?? null); setAuthOpen(true); },
    closeAuth: () => setAuthOpen(false),
  }), [barHidden, authOpen, authLead]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppUI() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppUI는 AppUIProvider 안에서만 쓴다');
  return v;
}
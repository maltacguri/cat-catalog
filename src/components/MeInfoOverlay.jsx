// 이용안내 · 개인정보 처리방침 공용 — 새 오버레이 패턴을 만들지 않고
// CatRegisterForm의 풀스크린 슬라이드 오버레이(.register-page/.rf-*)를 그대로 재사용한다.
export default function MeInfoOverlay({ open, title, onClose, children }) {
  return (
    <div className={`register-page ${open ? 'show' : ''}`}>
      <div className="rf-header">
        <button className="rf-back" onClick={onClose} aria-label="닫기">←</button>
        <div className="rf-title">{title}</div>
      </div>
      <div className="rf-body">{children}</div>
    </div>
  );
}

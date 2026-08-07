/**
 * 등록 확인 단계 (§2.11). 지도 + 를 누르면 등록 폼 전에 이 한 단계.
 * 강제 아님 — 백드롭으로 닫을 수 있고 0건 분기도 없다.
 *   아니요, 확인해볼래요 → 도감(NearbyPage)S
 *   네, 확인했어요       → 등록 폼
 */
export default function RegisterConfirm({ open, onGoCatalog, onGoForm, onClose }) {
  if (!open) return null;
  return (
    <div className="rc-backdrop" onClick={onClose}>
      <div className="rc-sheet" onClick={(e) => e.stopPropagation()}>
        <p className="rc-q">주변에 등록된 다른 고양이들을<br />확인해보셨나요?</p>
        <button className="rc-btn rc-line" onClick={onGoCatalog}>아니요, 확인해볼래요</button>
        <button className="rc-btn rc-fill" onClick={onGoForm}>네, 확인했어요</button>
      </div>
    </div>
  );
}
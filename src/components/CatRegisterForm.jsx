/**
 * 3단 — 고양이 등록 폼. 로드맵 §2.10 "등록 폼도 오버레이다" —
 * CatDetailPage와 같은 패턴(라우트 없음, transform으로 열고 닫힘).
 *
 * 껍데기만: 필드·사진 업로드·지도 마커·DB 접근은 이후 작업(§2.11, Phase D)에서 채운다.
 */
export default function CatRegisterForm({ open, onClose }) {
  return (
    <div className={`register-page ${open ? 'show' : ''}`}>
      <div className="rf-header">
        <button className="rf-back" onClick={onClose} aria-label="닫기">←</button>
        <div className="rf-title">냥이 등록하기</div>
      </div>

      <div className="rf-body" />

      <div className="rf-footer">
        <button className="rf-submit" disabled>등록하기</button>
      </div>
    </div>
  );
}

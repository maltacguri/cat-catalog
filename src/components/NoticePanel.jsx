import { COPY } from '../lib/format';

// 「이용 안내」 오버레이 (§2.16). MeInfoOverlay 와 같은 풀스크린 슬라이드 패턴(.register-page/.rf-*) 재사용.
// 문구는 전부 lib/format.js 의 COPY.noticeSections 에서 온다 — 컴포넌트엔 하드코딩하지 않는다.
export default function NoticePanel({ open, onClose }) {
  return (
    <div className={`register-page ${open ? 'show' : ''}`}>
      <div className="rf-header">
        <button className="rf-back" onClick={onClose} aria-label="닫기">←</button>
        <div className="rf-title">이용 안내</div>
      </div>
      <div className="rf-body notice-body">
        {COPY.noticeSections.map((section) => (
          <div className="notice-section" key={section.title}>
            <p className="notice-section-title">{section.title}</p>
            {section.paragraphs.map((p, i) => (
              <p className="notice-section-body" key={i}>{p}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

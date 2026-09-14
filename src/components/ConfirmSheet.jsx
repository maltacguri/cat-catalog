// 네이티브 confirm() 교체 (로드맵 Phase F). 2026-09-14.
//
// 왜 바꾸는가 — 네이티브 confirm()은 ① 디자인 토큰이 안 먹고 ② 모바일 브라우저가
// 대화상자 머리에 도메인(www.gilnyangee.com)을 노출한다. 앱 안에서 물어보는 것처럼 안 보인다.
//
// 왜 라이브러리(vaul 등)를 안 쓰는가 — 이 앱의 오버레이는 전부 `.phone`(overflow:hidden)
// 안쪽에 position:absolute 로 앉는다. 포털로 document.body 에 붙는 시트는 데스크톱에서
// 폰 프레임을 뚫고 화면 전체를 덮는다. 컨테이너를 넘겨 맞출 수는 있지만, 그러자고
// 의존성과 포커스 트랩을 새로 들이는 것보다 기존 RegisterConfirm 패턴을 그대로 쓰는 편이 싸다.
//
// 마크업·클래스는 RegisterConfirm(.rc-*)과 같다 — 같은 질문 UI는 같게 보여야 한다.
import { useEffect, useRef } from 'react';

/**
 * @param {string}   message   물어볼 문구 (COPY 에서 온 것만 쓴다)
 * @param {string}   confirmLabel  진행 버튼 라벨
 * @param {string}   cancelLabel   취소 버튼 라벨
 * @param {Function} onConfirm
 * @param {Function} onCancel  backdrop·ESC·취소 버튼이 모두 이걸 부른다
 */
export default function ConfirmSheet({
  message,
  confirmLabel = '네, 할게요',
  cancelLabel = '아니요',
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  // confirm() 이 주던 것 중 실제로 필요한 두 가지만 되살린다 — ESC 로 닫기, 포커스 들어가기.
  useEffect(() => {
    confirmRef.current?.focus();
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="rc-backdrop" onClick={onCancel}>
      <div
        className="rc-sheet"
        role="alertdialog"
        aria-modal="true"
        aria-label={message}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="rc-q">{message}</p>
        <button ref={confirmRef} className="rc-btn rc-fill" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button className="rc-btn rc-line" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

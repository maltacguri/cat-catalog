// 홈 화면 첫 진입 시 사용법 안내 (§2.7-7 후속). 완료 플래그는 profiles.home_guide_seen_at.
// 전체화면 암전 + 중앙 단일 메시지, 스텝 넘김 방식.
import { useState } from 'react';
import { markHomeGuideSeen } from '../api/auth';

const PAW_LIGHT = '#FBF7EF';
const PAW_PINK = '#F7ADAD';

function PawIcon() {
  return (
    <svg viewBox="0 0 96 96" width="56" height="56" aria-hidden="true">
      <circle cx="48" cy="48" r="31" fill={PAW_PINK} fillOpacity="0.22" />
      <g fill={PAW_LIGHT}>
        <ellipse cx="36.4" cy="43.2" rx="5.9" ry="6.9" transform="rotate(-20 36.4 43.2)" />
        <ellipse cx="44" cy="38" rx="5.9" ry="7.3" transform="rotate(-7 44 38)" />
        <ellipse cx="52" cy="38" rx="5.9" ry="7.3" transform="rotate(7 52 38)" />
        <ellipse cx="59.6" cy="43.2" rx="5.9" ry="6.9" transform="rotate(20 59.6 43.2)" />
        <ellipse cx="48" cy="52.8" rx="13.4" ry="10.4" />
      </g>
      <g fill={PAW_PINK}>
        <ellipse cx="36.5" cy="43.6" rx="3.2" ry="3.9" transform="rotate(-20 36.5 43.6)" />
        <ellipse cx="44.1" cy="38.6" rx="3.2" ry="4.2" transform="rotate(-7 44.1 38.6)" />
        <ellipse cx="51.9" cy="38.6" rx="3.2" ry="4.2" transform="rotate(7 51.9 38.6)" />
        <ellipse cx="59.5" cy="43.6" rx="3.2" ry="3.9" transform="rotate(20 59.5 43.6)" />
        <path d="M48 46 Q56.6 48.4 57.6 52.1 Q58 56.2 48 58.8 Q38 56.2 38.4 52.1 Q39.4 48.4 48 46 Z" />
      </g>
    </svg>
  );
}

const STEPS = [
  {
    icon: true,
    title: '지도에서 발바닥을\n눌러보세요',
    body: '등록된 고양이예요. 누르면 이름과 마지막으로 밥 먹은 시간이 나와요.',
  },
  {
    title: '「밥 줬어요」\n「여기서 봤어요」',
    body: '고양이 프로필 아래쪽 버튼이에요. 밥을 줬거나 마주쳤다면 남겨주세요. 다음 사람이 "3시간 전에 먹었구나" 하고 알 수 있어요.',
  },
  {
    title: '처음 보는 고양이라면\n등록해주세요',
    body: '사진 한 장, 이름, 색이면 충분해요. 이미 등록된 아이는 아닌지 먼저 확인해주세요.',
  },
  {
    title: '위치는 일부러\n정확하지 않아요',
    body: '넓게, 그리고 한 시간 늦춰서 보여줘요. 찾아가라고 만든 앱이 아니라, 마주쳤을 때 알아보라고 만든 앱이거든요.',
  },
];

export default function HomeGuideOverlay({ onDone }) {
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const last = idx === STEPS.length - 1;
  const step = STEPS[idx];

  async function handleNext() {
    if (busy) return;
    if (!last) {
      setIdx(idx + 1);
      return;
    }
    setBusy(true);
    try {
      await markHomeGuideSeen();
    } catch (e) {
      console.error(e);
    }
    onDone();
  }

  return (
    <div className="homeguide-veil">
      <div className="homeguide-icon">{step.icon ? <PawIcon /> : null}</div>

      <b className="homeguide-step-title">{step.title}</b>
      <p className="homeguide-step-body">{step.body}</p>

      <div className="homeguide-dots">
        {STEPS.map((_, i) => (
          <span key={i} className={`homeguide-dot ${i === idx ? 'is-on' : ''}`} />
        ))}
      </div>

      <button type="button" className="homeguide-next" disabled={busy} onClick={handleNext}>
        {last ? '시작하기' : '다음'}
      </button>
    </div>
  );
}
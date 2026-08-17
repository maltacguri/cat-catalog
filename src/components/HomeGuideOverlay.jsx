// 홈 화면 첫 진입 시 사용법 안내 (§2.7-7 후속). 완료 플래그는 profiles.home_guide_seen_at.
import { useState } from 'react';
import { markHomeGuideSeen } from '../api/auth';

const PAW_INK = '#343434';
const PAW_PINK = '#F7ADAD';

function PawIcon() {
  return (
    <svg viewBox="0 0 96 96" width="26" height="26">
      <circle cx="48" cy="48" r="31" fill={PAW_PINK} fillOpacity="0.43" />
      <circle cx="48" cy="48" r="31" fill="none" stroke={PAW_PINK} strokeOpacity="0.9" strokeWidth="1" />
      <g fill={PAW_INK}>
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

export default function HomeGuideOverlay({ onDone }) {
  const [busy, setBusy] = useState(false);

  async function handleStart() {
    if (busy) return;
    setBusy(true);
    try {
      await markHomeGuideSeen();
    } catch (e) {
      console.error(e);
    }
    onDone();
  }

  return (
    <div className="sheet-backdrop">
      <div className="homeguide-panel" onClick={(e) => e.stopPropagation()}>
        <div className="homeguide-scroll">
          <b className="homeguide-title">어디냐옹, 이렇게 써요</b>

          <ul className="homeguide-list">
            <li className="homeguide-item">
              <PawIcon />
              <span><b>지도에서 발바닥을 눌러보세요</b> — 등록된 고양이예요. 누르면 이름과 마지막으로 밥 먹은 시간이 나와요.</span>
            </li>
            <li className="homeguide-item">
              <span><b>「밥 줬어요」·「여기서 봤어요」</b> — 고양이 프로필 아래쪽 버튼이에요. 밥을 줬거나 마주쳤다면 남겨주세요. 다음 사람이 "3시간 전에 먹었구나" 하고 알 수 있어요.</span>
            </li>
            <li className="homeguide-item">
              <span><b>처음 보는 고양이라면 등록해주세요</b> — 사진 한 장, 이름, 색이면 충분해요. 이미 등록된 아이는 아닌지 먼저 확인해주세요.</span>
            </li>
          </ul>

          <blockquote className="homeguide-quote">
            <b>위치는 일부러 정확하지 않아요.</b> 넓게, 그리고 한 시간 늦춰서 보여줘요.
            찾아가라고 만든 앱이 아니라, 마주쳤을 때 알아보라고 만든 앱이거든요.
          </blockquote>
        </div>

        <div className="homeguide-footer">
          <button className="btn-primary" disabled={busy} onClick={handleStart}>
            시작하기
          </button>
        </div>
      </div>
    </div>
  );
}

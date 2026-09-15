// 집사 페이지 상단 고정 카드 — 홈 화면 추가 안내 + 설치 버튼.
// 상황이 넷이고 브라우저마다 할 수 있는 게 달라서 분기를 여기 모았다.
//   1) 이미 설치됨          → 안내만
//   2) 인앱 브라우저(카톡 등) → 설치 불가. 브라우저로 열라고 안내
//   3) 설치 프롬프트 가능    → 버튼 한 번으로 끝 (안드로이드 Chrome)
//   4) iOS / 그 외          → 수동 경로 안내 (공유 → 홈 화면에 추가)
import { useEffect, useState } from 'react';
import { Check, Download, ExternalLink, Share } from 'lucide-react';

import {
  canPrompt, inAppBrowser, isIOS, isStandalone, promptInstall, subscribeInstall,
} from '../lib/install';

export default function InstallCard() {
  // subscribeInstall 로 beforeinstallprompt 도착 시점에 다시 그린다
  const [, bump] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => subscribeInstall(() => bump((n) => n + 1)), []);

  if (isStandalone() || done) {
    return (
      <div className="install-card is-done">
        <Check className="install-icon" size={18} strokeWidth={1.8} />
        <div className="install-body">
          <b className="install-title">홈 화면에 추가됨</b>
          <p className="install-desc">이제 아이콘으로 바로 열 수 있어요.</p>
        </div>
      </div>
    );
  }

  const app = inAppBrowser();
  if (app) {
    return (
      <div className="install-card">
        <ExternalLink className="install-icon" size={18} strokeWidth={1.8} />
        <div className="install-body">
          <b className="install-title">홈 화면에 추가하기</b>
          <p className="install-desc">
            지금은 {app} 안에서 보고 있어서 추가할 수 없어요.
            메뉴에서 <b>다른 브라우저로 열기</b>를 누른 뒤 다시 와주세요.
          </p>
        </div>
      </div>
    );
  }

  if (canPrompt()) {
    return (
      <div className="install-card">
        <Download className="install-icon" size={18} strokeWidth={1.8} />
        <div className="install-body">
          <b className="install-title">홈 화면에 추가하기</b>
          <p className="install-desc">
            추가해두면 주소를 찾지 않아도 아이콘으로 바로 열려요.
          </p>
          <button
            className="install-btn"
            onClick={async () => {
              const outcome = await promptInstall();
              if (outcome === 'accepted') setDone(true);
            }}
          >
            추가하기
          </button>
        </div>
      </div>
    );
  }

  // iOS 는 설치 프롬프트가 없다. 공유 시트를 거치는 수동 경로뿐이다
  const ios = isIOS();
  return (
    <div className="install-card">
      <Share className="install-icon" size={18} strokeWidth={1.8} />
      <div className="install-body">
        <b className="install-title">홈 화면에 추가하기</b>
        <p className="install-desc">
          추가해두면 주소를 찾지 않아도 아이콘으로 바로 열려요.
        </p>
        <ol className="install-steps">
          {ios ? (
            <>
              <li>아래 <b>공유</b> 버튼을 누르고</li>
              <li><b>홈 화면에 추가</b>를 고른 뒤</li>
              <li>오른쪽 위 <b>추가</b>를 누르면 끝이에요.</li>
            </>
          ) : (
            <>
              <li>브라우저 메뉴를 열고</li>
              <li><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 고르세요.</li>
            </>
          )}
        </ol>
      </div>
    </div>
  );
}

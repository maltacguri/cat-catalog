// 홈 화면 설치 상태 판정 + 설치 프롬프트 보관.
//
// ⚠️ beforeinstallprompt 는 페이지 로드 직후 딱 한 번 발생한다. React 컴포넌트의
//    useEffect 로 잡으려 하면 마운트가 늦어 이벤트를 놓친다. 그래서 이 모듈은
//    "로드되는 순간" window 리스너를 건다 — main.jsx 가 App 보다 먼저 import 한다.

let deferredPrompt = null;
const subscribers = new Set();

function emit() {
  for (const fn of subscribers) fn();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // 기본값을 막지 않으면 브라우저가 자기 배너를 띄운다. 우리 버튼으로 돌린다
    e.preventDefault();
    deferredPrompt = e;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });
}

/** 설치 상태가 바뀔 때 호출된다. 해제 함수를 돌려준다 */
export function subscribeInstall(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/** 이미 홈 화면에서 실행 중인가 (standalone). iOS 는 표준 API 대신 navigator.standalone */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ 는 UA 를 Macintosh 로 보낸다 — 터치 포인트로 가려낸다
  return /iphone|ipad|ipod/i.test(ua)
    || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * 인앱 브라우저인가. 여기서는 홈 화면 추가 자체가 불가능하다.
 * 캠퍼스 링크는 거의 카톡으로 퍼질 테니 이 분기가 실제로 제일 많이 걸린다.
 */
export function inAppBrowser() {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return '카카오톡';
  if (/Instagram/i.test(ua)) return '인스타그램';
  if (/FBAN|FBAV/i.test(ua)) return '페이스북';
  if (/Line\//i.test(ua)) return '라인';
  if (/NAVER\(inapp|NAVER\//i.test(ua)) return '네이버';
  if (/DaumApps/i.test(ua)) return '다음';
  return null;
}

/** 설치 프롬프트를 지금 띄울 수 있는가 (안드로이드 Chrome 계열) */
export function canPrompt() {
  return deferredPrompt !== null;
}

/**
 * 설치창을 띄운다. 'accepted' | 'dismissed' | 'unavailable' 을 돌려준다.
 * 프롬프트는 1회용이라 한 번 쓰면 버린다 — 재사용하면 예외가 난다.
 */
export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  const e = deferredPrompt;
  deferredPrompt = null;
  emit();
  e.prompt();
  const { outcome } = await e.userChoice;
  return outcome;
}

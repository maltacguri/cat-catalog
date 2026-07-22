// ============================================================
// 정책 상수 — 로드맵 v2 §2 확정 사항이 코드로 들어오는 곳
// 값을 바꾸려면 로드맵 문서를 먼저 고칠 것.
// ============================================================

export const CAMPUS_SLUG = 'hongik';

export const POLICY = {
  // §2.4 사진 공개 범위
  COVER_BUCKET: 'cat-covers',   // 공개. 대표 사진 1장
  PHOTO_BUCKET: 'cat-photos',   // 비공개. 나머지 사진
  SIGNED_URL_TTL_SEC: 60 * 10,

  // §2.3 목격 지연 1시간
  //   여기 값은 안내 문구용이고, 실제 차단은 DB 의 sighting_delay() 가 한다.
  //   두 값을 반드시 같게 유지할 것.
  SIGHTING_DELAY_HOURS: 1,

  // §2.3 좌표 반올림 격자 (lib/geo.js 에서 사용)
  GRID_DEG: 0.00045,
  GRID_RADIUS_M: 50,

  // §2.6 과급식 방지 — 이 시간 안에 이미 기록이 있으면 한 번 되묻는다
  RECENT_FEED_WARN_HOURS: 2,

  // 사진 업로드 (Phase D)
  PHOTO_MAX_SIDE: 1600,
  PHOTO_QUALITY: 0.85,
};

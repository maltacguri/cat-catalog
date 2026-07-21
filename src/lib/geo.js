// ============================================================
// 위치 처리 — 로드맵 §2.3 / 원칙 5
//
//   지도에서 찍은 좌표를 저장 직전에 50m 격자로 반올림한다.
//   정밀 좌표는 DB에 들어가지 않는다. 유출돼도 나가는 건 격자까지.
//
//   마커 UX 는 그대로다. 유저는 원하는 지점을 정확히 찍고,
//   반올림된 지점에 마커가 뜬다. PostGIS 불필요.
//
//   랜덤 오프셋이 아니라 라운딩인 이유:
//   랜덤은 같은 개체 기록이 쌓이면 평균으로 원본이 복원된다.
//   라운딩은 결정적이라 복원할 잔차가 없다.
// ============================================================

import { POLICY } from '../config/policy';

// 위도 0.00045° ≈ 50m.
// 경도는 서울 위도(약 37.5°)에서 같은 값이 약 40m다.
// 로드맵대로 두 축에 같은 상수를 쓴다 — 격자가 50×40m 직사각형이 되는 건 감수.
export const GRID_DEG = POLICY.GRID_DEG;
export const GRID_RADIUS_M = POLICY.GRID_RADIUS_M;

export const roundToGrid = (v) => Math.round(v / GRID_DEG) * GRID_DEG;

/**
 * 저장 직전 반올림. 원본 좌표는 여기서 버린다.
 * ⚠️ sightings 를 insert 하는 모든 경로가 이 함수를 통과해야 한다.
 */
export function snapToGrid({ lat, lng }) {
  return { lat: roundToGrid(lat), lng: roundToGrid(lng) };
}

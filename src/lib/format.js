// 시간 표기 + 화면 문구를 한곳에 모은다.
// 문구는 서비스 톤을 좌우하니 개발자가 코드 안에서 즉흥으로 쓰지 말 것.

import { POLICY } from '../config/policy';

/** 급식처럼 정확해도 되는 시간 */
export function agoKo(iso) {
  if (!iso) return null;
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return `${Math.floor(d / 7)}주 전`;
}

/** 목격처럼 뭉개야 하는 시간 — 분 단위로 알려주면 찾아갈 수 있다 */
export function agoCoarseKo(iso) {
  if (!iso) return null;
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (h < 24) return '오늘 중';
  if (h < 48) return '어제쯤';
  if (h < 24 * 7) return '이번 주';
  if (h < 24 * 21) return '2~3주 전';
  return '한참 전';
}

export const SEX_KO = { male: '수컷', female: '암컷', unknown: '성별 모름' };

// Phase E — 급식 종류. DB 엔 슬러그, 라벨은 표시용 (COLOR_ORDER/COLOR_KO 와 같은 패턴)
export const KIND_ORDER = ['food', 'treat', 'water'];
export const KIND_KO = { food: '밥', treat: '간식', water: '물' };

// §2.11 색 7종. DB 에는 슬러그를 저장하고 라벨은 여기서 매핑한다.
//   라벨을 바꿔도 데이터 마이그레이션이 생기지 않는다. 배열 순서 = 폼 표시 순서.
//   값이 들어오는 경로가 폼·대시보드·API 3개라 실제 방어는 DB CHECK 제약이 한다.
export const COLOR_ORDER = ['cheese', 'mackerel', 'calico', 'tuxedo', 'black', 'white', 'other'];
export const COLOR_KO = {
  cheese: '치즈', mackerel: '고등어', calico: '삼색이/카오스',
  tuxedo: '턱시도/젖소', black: '검정', white: '흰색', other: '기타',
};

// §2.11 중성화. 화면 3택 ↔ DB 는 true/false/null(모름, 기본)
export const NEUTERED_KO = { yes: '했어요', no: '안 했어요', unknown: '모름' };
export const NEUTERED_TO_DB = { yes: true, no: false, unknown: null };

export const COPY = {
  noFeedRecord: '아직 기록이 없어요.',
  feedRecordCaveat:
    '여기 기록이 전부는 아니에요. 기록을 남기지 않고 챙기는 분들도 많아서, 비어 있거나 오래됐다고 굶었다고 볼 수는 없어요.',
  blurNotice: '고양이 보호를 위해 위치는 넓게, 시간은 늦춰서 보여줍니다.',
  sightingSaved: `등록됐어요. 다른 사람 화면에는 약 ${POLICY.SIGHTING_DELAY_HOURS}시간 뒤부터 보입니다.`,
  sightingRecorded: `기록됐어요. 다른 사람에게는 약 ${POLICY.SIGHTING_DELAY_HOURS}시간 뒤부터 보여요.`,
  recentFeedWarn: (ago, label) => `${ago}에 이미 ${label} 기록이 있어요. 그래도 기록할까요?`,
  detailLocked: '로그인하면 다른 집사들이 올린 다른 냥이 사진, 건강 정보까지 볼 수 있어요.',
  writeLocked: '로그인하면 기록할 수 있어요.',
  tabLocked: '로그인하면 더 많은 정보를 볼 수 있어요',
  deletedGiver: '탈퇴한 집사',
};

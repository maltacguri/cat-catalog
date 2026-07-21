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
export const FEED_KO = { food: '밥', water: '물', treat: '간식' };

export const COPY = {
  noFeedRecord:
    '아직 기록이 없어요. 기록이 없다고 굶은 건 아니에요 — 도감에 남기지 않고 챙기는 분들도 많아요.',
  blurNotice: '고양이 보호를 위해 위치는 넓게, 시간은 늦춰서 보여줍니다.',
  sightingSaved: `등록됐어요. 다른 사람 화면에는 약 ${POLICY.SIGHTING_DELAY_HOURS}시간 뒤부터 보입니다.`,
  recentFeedWarn: (ago) => `${ago}에 이미 급식 기록이 있어요. 그래도 기록할까요?`,
  detailLocked: '로그인하면 다른 집사들이 올린 다른 냥이 사진, 건강 정보까지 볼 수 있어요.',
  writeLocked: '로그인하면 기록할 수 있어요.',
  tabLocked: '로그인하면 더 많은 정보를 볼 수 있어요',
};

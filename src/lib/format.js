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

// ============================================================
// §2.19 관측시각(seen_at) — 고양이를 실제로 본 시각. 기록을 남긴 시각(created_at)과 다르다.
//   ⚠️ 1시간 지연 기준은 created_at 그대로다. seen_at 은 화면 표기에만 쓴다.
//   여기 있던 agoCoarseKo('오늘 중'·'어제쯤')는 §2.19 가 대체했다 — 호출부가 없어 지웠다.
// ============================================================

/**
 * 목격 시각 표기 (§2.19). 포맷은 아래 3개가 전부다 — 올해/작년 같은 분기를 만들지 않는다.
 *   24시간 이내 → '3시간 전'          (1시간 미만도 '1시간 전'. '방금'을 만들지 않는다)
 *   7일 이내    → '2일 전'
 *   그 초과     → '2026. 08. 27.'     (월·일 0패딩, 끝점 포함)
 *
 * ⚠️ 적용 지점은 3곳뿐이다 — 지도 카드 · 상세 히어로 · 목격 타임라인. 다른 표기 함수를 섞지 않는다.
 */
export function formatSeenAt(ts) {
  if (!ts) return null;
  const t = new Date(ts);
  if (Number.isNaN(t.getTime())) return null;
  // 클라이언트 시계가 서버보다 느리면 방금 들어온 기록이 미래로 읽힌다 — 음수는 0으로 깎는다.
  const h = Math.floor(Math.max(0, Date.now() - t.getTime()) / 3600000);
  if (h < 24) return `${Math.max(1, h)}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  const p = (n) => String(n).padStart(2, '0');
  return `${t.getFullYear()}. ${p(t.getMonth() + 1)}. ${p(t.getDate())}.`;
}

/**
 * Date → <input type="datetime-local"> 가 받는 로컬 시각 문자열(YYYY-MM-DDTHH:mm).
 * toISOString() 을 넣으면 UTC라 한국에서 9시간 밀린 값이 칸에 뜬다.
 */
export function toSeenAtInput(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 입력칸 값 → DB 로 보낼 ISO 문자열 (§2.19).
 *   '' (기본값 '지금'에서 손대지 않음) → null. 호출부는 이때 seen_at 키 자체를 빼고,
 *   DB default now() 가 채운다. 클라이언트에서 now() 를 계산해 넣지 않는 이유다.
 *   미래 시각은 DB CHECK(seen_at <= created_at) 에 걸리므로 화면에서 먼저 막는다.
 */
export function seenAtToIso(value) {
  if (!value) return null;
  const t = new Date(value);
  if (Number.isNaN(t.getTime())) throw new Error(COPY.seenAtInvalid);
  if (t.getTime() > Date.now()) throw new Error(COPY.seenAtFuture);
  return t.toISOString();
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

// §2.16 고양이 민원 창구. DB 엔 슬러그, 라벨은 표시용 (COLOR_ORDER/COLOR_KO 와 같은 패턴)
export const REPORT_KIND_KO = {
  profile: '잘못된 정보·중복 등록', photo: '사진 삭제 요청', other: '기타',
};
export const REPORT_STATUS_KO = { pending: '처리 대기', resolved: '처리 완료', rejected: '반려' };

export const COPY = {
  noFeedRecord: '아직 기록이 없어요.',
  noSightRecord: '아직 목격 기록이 없어요.',
  sightNotePlaceholder: '달라진 점이 있었나요? (선택)',
  // §2.19 관측시각 입력 — 「여기서 봤어요」 시트와 냥이 등록 폼이 같은 문구를 쓴다
  seenAtLabel: '언제 봤나요?',
  seenAtFormLabel: '본 시각',
  seenAtHint: '기본값은 지금이에요. 다른 때 봤다면 바꿔주세요. (선택)',
  seenAtFuture: '아직 오지 않은 시각은 기록할 수 없어요.',
  seenAtInvalid: '시각을 다시 확인해 주세요.',
  feedRecordCaveat:
    '여기 기록이 전부는 아니에요. 기록을 남기지 않고 챙기는 분들도 많아서, 비어 있거나 오래됐다고 굶었다고 볼 수는 없어요.',
  dangerFoods:
    '사람 음식은 대부분 위험해요. 양파·마늘·파가 들어간 것, 우유, 사람용 참치캔, 초콜릿, 닭뼈는 절대 안 돼요. 고양이 사료나 간식, 깨끗한 물만 주세요.',
  blurNotice: '고양이 보호를 위해 위치는 넓게, 시간은 늦춰서 보여줍니다.',
  sightingSaved: `등록됐어요. 다른 사람 화면에는 약 ${POLICY.SIGHTING_DELAY_HOURS}시간 뒤부터 보입니다.`,
  sightingRecorded: `기록됐어요. 다른 사람에게는 약 ${POLICY.SIGHTING_DELAY_HOURS}시간 뒤부터 보여요.`,
  recentFeedWarn: (ago, label) => `${ago}에 이미 ${label} 기록이 있어요. 그래도 기록할까요?`,
  detailLocked: '로그인하면 다른 집사들이 올린 다른 냥이 사진, 건강 정보까지 볼 수 있어요.',
  writeLocked: '로그인하면 기록할 수 있어요.',
  tabLocked: '로그인하면 더 많은 정보를 볼 수 있어요',
  deletedGiver: '탈퇴한 집사',
  // §2.16 NoticePanel(「이용 안내」) 본문 — 소제목 + 문단 배열
  noticeSections: [
    {
      title: '이 앱은 고양이를 찾아가라고 만든 게 아니에요',
      paragraphs: [
        '캠퍼스에서 우연히 마주친 고양이를 알아보게 하려고 만들었어요. 찾아가기보다는 우연히 만나는 쪽이었으면 해서, 지금 어디 있는지는 알려주지 않아요. 고양이의 위치는 1시간 뒤에 지도에 나타나요. 찾아가는 것을 방지하기 위한 수단이에요.',
      ],
    },
    {
      title: '위치는 일부러 흐리게 저장해요',
      paragraphs: [
        '사진 속 위치정보(GPS)는 올리는 순간 지워지고, 서버에도 남지 않아요. 목격 위치는 50m 단위로 뭉뚱그려 저장돼서 정확한 좌표는 아예 기록되지 않고요. 내가 남긴 목격은 다른 사람에게 약 1시간 뒤부터 보여요.',
        '번거로워 보여도, 고양이가 사는 자리를 지키려면 이 정도는 필요해요.',
      ],
    },
    {
      title: '기록이 없다고 굶은 건 아닙니다',
      paragraphs: [
        '밥 기록은 누가 남겨줬을 때만 쌓여요. 챙겨주고도 기록을 안 남긴 사람이 훨씬 많거든요. "6시간째 기록 없음"은 6시간을 굶었다는 뜻이 아니라, 6시간 동안 아무도 기록하지 않았다는 뜻이에요.',
        '한 마리에게 밥이 몰리는 것도 좋지 않아서, 같은 종류를 2시간 안에 다시 주려고 하면 한 번 더 물어봐요. 물은 언제든 괜찮아요.',
      ],
    },
    {
      title: '대학생이 만든 프로젝트예요',
      paragraphs: [
        '부산대생과 홍대생이 기획하고 만들었어요. 완전히 무료고, 유료로 전환할 생각은 없습니다.',
      ],
    },
  ],
};

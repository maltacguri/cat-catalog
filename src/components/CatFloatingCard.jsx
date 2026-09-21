import CatPhoto from './CatPhoto';
import { agoKo, formatSeenAt } from '../lib/format';

/**
 * 1단 — 플로팅 카드. 지도 마커를 한 번 누르면 뜬다.
 *
 * 로드맵 §2.2 — 게스트가 볼 수 있는 것은 여기까지가 전부다.
 *   대표 사진 · 이름 · 최근 밥 · 특이사항
 *
 * ⚠️ 여기에 항목을 추가하는 건 "게스트에게 공개한다"는 뜻이다.
 *    성별이 없는 건 실수가 아니다 — 로드맵 §2.7-1 확정. 성별은 상세 프로필에만 나온다.
 *    게스트는 애초에 DB(cats_guest 뷰)에서 성별을 받지도 못한다.
 *
 * ⚠️ 최근 목격 시각(§2.19)도 같은 이유로 조건부다 — cats_guest 뷰에 last_sighted_at 이 없어서
 *    게스트에게는 값 자체가 오지 않는다. 차단은 여기 if 가 아니라 DB 뷰가 하고 있다.
 *    cats_guest 에 이 컬럼을 올리는 순간 게스트 화면에 시각이 뜬다 — 뷰를 고칠 때 여기를 같이 볼 것.
 */
export default function CatFloatingCard({ cat, onOpen }) {
  const traits = cat?.traits ?? [];

  return (
    <button className={`floating-card ${cat ? 'show' : ''}`} onClick={onOpen}>
      {cat && (
        <>
          <div className="fc-hero">
            <CatPhoto path={cat.cover_path} kind="cover" alt={cat.name} />
          </div>
          <div className="fc-info">
            <div className="fc-title">{cat.name}</div>
            <div className="fc-feed">
              최근 식사 <span>{agoKo(cat.last_fed_at) ?? '기록 없음'}</span>
            </div>
            {cat.last_sighted_at && (
              <div className="fc-seen">
                최근 목격 <span>{formatSeenAt(cat.last_sighted_at)}</span>
              </div>
            )}
            {traits.length > 0 && (
              <ul className="fc-traits">
                {/* 카드가 길어지지 않게 두 개까지만 */}
                {traits.slice(0, 2).map((t, i) => <li key={i}>{t}</li>)}
                {traits.length > 2 && <li className="more">외 {traits.length - 2}가지</li>}
              </ul>
            )}
          </div>
        </>
      )}
    </button>
  );
}

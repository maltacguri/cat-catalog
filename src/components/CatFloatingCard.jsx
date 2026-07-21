import CatPhoto from './CatPhoto';
import { agoKo } from '../lib/format';

/**
 * 1단 — 플로팅 카드. 지도 마커를 한 번 누르면 뜬다.
 *
 * 로드맵 §2.2 — 게스트가 볼 수 있는 것은 여기까지가 전부다.
 *   대표 사진 · 이름 · 최근 밥 · 특이사항
 *
 * ⚠️ 여기에 항목을 추가하는 건 "게스트에게 공개한다"는 뜻이다.
 *    성별이 없는 건 실수가 아니다 — 로드맵 §3-1 미확정.
 *    게스트는 애초에 DB(cats_guest 뷰)에서 성별을 받지도 못한다.
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

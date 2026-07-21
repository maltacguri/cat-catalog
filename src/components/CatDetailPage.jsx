import { useEffect, useState } from 'react';
import CatPhoto from './CatPhoto';
import { fetchCatDetail } from '../api/cats';
import { addFeeding, isTooSoon } from '../api/feedings';
import { agoKo, agoCoarseKo, SEX_KO, FEED_KO, COPY } from '../lib/format';

/**
 * 2단 — 상세 페이지. 플로팅 카드를 누르면 올라온다.
 *
 * 로드맵 §2.2 — 여기부터는 로그인 게이트다.
 * 게스트가 이 화면을 열 수 없는 건 화면 로직이 아니라 RLS 때문이다.
 * (cats_full / sightings / feedings 는 authenticated 에게만 열려 있다)
 */
export default function CatDetailPage({ catId, onClose }) {
  const [cat, setCat] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setCat(null);
    setDone(false);
    if (!catId) return;
    let alive = true;
    fetchCatDetail(catId).then((d) => alive && setCat(d)).catch(console.error);
    return () => { alive = false; };
  }, [catId]);

  async function handleFeed() {
    // 과급식 방지 (§2.6) — 최근 기록이 너무 최근이면 한 번 되묻는다
    if (isTooSoon(cat?.last_fed_at) && !confirm(COPY.recentFeedWarn(agoKo(cat.last_fed_at)))) {
      return;
    }
    setSaving(true);
    try {
      await addFeeding({ catId });
      setDone(true);
      setCat((c) => ({ ...c, last_fed_at: new Date().toISOString() }));
    } catch (e) {
      alert('기록에 실패했어요. 잠시 후 다시 시도해 주세요.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`detail-page ${catId ? 'show' : ''}`}>
      <button className="back-btn" onClick={onClose} aria-label="닫기">←</button>

      {cat && (
        <>
          <div className="dp-hero">
            <CatPhoto path={cat.cover_path} kind="cover" alt={cat.name} />
          </div>

          <div className="dp-body">
            <div className="dp-title">{cat.name}</div>
            <div className="dp-subtitle">
              {SEX_KO[cat.sex]}
              {cat.neutered === true && ' · 중성화 완료'}
              {cat.neutered === false && ' · 중성화 확인 필요'}
              {cat.code && ` · 도감 No.${cat.code}`}
            </div>
            <div className="dp-meta">
              {cat.last_sighted_at
                ? `${agoCoarseKo(cat.last_sighted_at)} 목격 · 지도에서 대략 위치 확인`
                : '최근 목격 기록 없음'}
            </div>
            {cat.description && <p className="dp-desc">{cat.description}</p>}
            <p className="notice">{COPY.blurNotice}</p>

            <div className="divider" />

            <div className="section-title">특이사항</div>
            <ul className="traits-list">
              {cat.traits?.length
                ? cat.traits.map((t, i) => <li key={i}>{t}</li>)
                : <li>아직 등록된 특이사항이 없어요.</li>}
            </ul>

            <div className="divider" />

            <div className="section-title">밥 기록</div>
            {cat.feedings.length > 0 ? (
              <ul className="feed-log">
                {cat.feedings.map((f) => (
                  <li key={f.id}>
                    <b>{FEED_KO[f.kind]}</b>
                    <span>{agoKo(f.fed_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="notice">{COPY.noFeedRecord}</p>
            )}

            <div className="divider" />

            <div className="section-title">다른 사진들</div>
            <div className="gallery">
              {cat.photos.map((p) => (
                <div className="gallery-item" key={p.id}>
                  <CatPhoto path={p.photo_path} kind="gallery" alt={cat.name} loggedIn />
                </div>
              ))}
              {cat.photos.length === 0 && <div className="gallery-item">아직 없어요</div>}
            </div>
          </div>

          <div className="bottom-bar">
            <div>
              <div className="bb-label">마지막으로 밥 먹은 시간</div>
              <div className="bb-value">
                {done ? '방금 (기록됨)' : agoKo(cat.last_fed_at) ?? '기록 없음'}
              </div>
            </div>
            <button className="bb-btn" onClick={handleFeed} disabled={saving || done}>
              {done ? '기록 완료' : saving ? '기록 중…' : '밥 주기'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

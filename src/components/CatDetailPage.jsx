import { useEffect, useRef, useState } from 'react';
import { Map } from 'react-kakao-maps-sdk';
import CatPhoto from './CatPhoto';
import { fetchCatDetail, fetchCampus } from '../api/cats';
import { addFeeding, isTooSoon } from '../api/feedings';
import { addSighting } from '../api/sightings';
import { useSession } from '../api/auth';
import { useAppUI } from './AppUI';
import { agoKo, agoCoarseKo, SEX_KO, KIND_KO, KIND_ORDER, COPY } from '../lib/format';

/**
 * 2단 — 상세 페이지. 플로팅 카드를 누르면 올라온다.
 * 로드맵 §2.2 — 여기부터는 로그인 게이트(RLS). cats_full/sightings/feedings 는 authenticated 전용.
 */
export default function CatDetailPage({ catId, onClose }) {
  const { loggedIn } = useSession();
  const { openAuth } = useAppUI();

  const [cat, setCat] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [sightOpen, setSightOpen] = useState(false);
  const [sightCenter, setSightCenter] = useState(null);
  const [sightSaving, setSightSaving] = useState(false);
  const [sightError, setSightError] = useState(null);
  const [sightDone, setSightDone] = useState(false);
  const sightMapRef = useRef(null);   // 제출 시점에 지도 중심을 읽는다 (CatRegisterForm 과 같은 패턴)

  useEffect(() => {
    setCat(null);
    setPickerOpen(false);
    setSightOpen(false);
    if (!catId) return;
    let alive = true;
    fetchCatDetail(catId).then((d) => alive && setCat(d)).catch(console.error);
    return () => { alive = false; };
  }, [catId]);

  // 오버레이 슬라이드 중 지도가 마운트되면 카카오가 타일을 어긋나게 그린다 → 끝난 뒤 relayout
  useEffect(() => {
    if (!sightOpen) return;
    const t = setTimeout(() => sightMapRef.current?.relayout(), 400);
    return () => clearTimeout(t);
  }, [sightOpen]);

  function openPicker() {
    if (!loggedIn) { openAuth(COPY.writeLocked); return; }
    setPickerOpen(true);
  }

  async function handleFeed(kind) {
    if (!loggedIn) { setPickerOpen(false); openAuth(COPY.writeLocked); return; }

    // 과급식 되묻기 (§2.6) — 같은 kind 의 최근 기록만 본다. water 는 건너뛴다.
    // cat.feedings 는 최근 10건(전체 kind 혼합)이라, 그 안에 없으면 "최근 아님"으로 취급한다.
    if (kind !== 'water') {
      const last = cat.feedings.find((f) => f.kind === kind);
      if (isTooSoon(last?.fed_at)
        && !confirm(COPY.recentFeedWarn(agoKo(last.fed_at), KIND_KO[kind]))) {
        return;
      }
    }

    setPickerOpen(false);
    setSaving(true);
    try {
      await addFeeding(catId, kind);
      setCat(await fetchCatDetail(catId));   // 급식 목록·최근 밥 표시 갱신
    } catch (e) {
      alert('기록에 실패했어요. 잠시 후 다시 시도해 주세요.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  // 지도 시작 중심 — 이 고양이의 마지막 목격 좌표, 없으면 캠퍼스 중심 (CatRegisterForm 과 같은 패턴)
  async function openSightMap() {
    if (!loggedIn) { openAuth(COPY.writeLocked); return; }
    setSightError(null);
    setSightDone(false);
    let center = cat.last_lat != null && cat.last_lng != null
      ? { lat: cat.last_lat, lng: cat.last_lng }
      : null;
    if (!center) {
      try {
        const campus = await fetchCampus();
        center = { lat: campus.center_lat, lng: campus.center_lng };
      } catch (e) {
        console.error(e);
      }
    }
    setSightCenter(center);
    setSightOpen(true);
  }

  function closeSightMap() {
    setSightOpen(false);
    setSightDone(false);
    setSightError(null);
    setSightCenter(null);
  }

  async function submitSighting() {
    const c = sightMapRef.current?.getCenter();
    if (!c) { setSightError('지도를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.'); return; }

    setSightSaving(true);
    setSightError(null);
    try {
      await addSighting({ catId, lat: c.getLat(), lng: c.getLng() });
      setSightDone(true);
      // ★ 화면의 마지막 목격 표시는 일부러 안 건드린다 — 1시간 지연은 DB 뷰가 강제하는
      //   비협상 규칙이다(§2.3). 여기서 좌표를 덮어쓰거나 다시 조회하지 않는다.
    } catch (e) {
      setSightError(e.message || String(e));
    } finally {
      setSightSaving(false);
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
            <p className="notice">{COPY.blurNotice}</p>

            <div className="divider" />

            {/* ★ traits(폐기) 섹션 제거 → description 을 "특이사항"으로 보여준다 (§2.11) */}
            <div className="section-title">특이사항</div>
            {cat.description
              ? <p className="dp-desc">{cat.description}</p>
              : <p className="notice">아직 등록된 특이사항이 없어요.</p>}

            <div className="divider" />

            <div className="section-title">밥 기록</div>
            {cat.feedings.length > 0 ? (
              <ul className="feed-log">
                {cat.feedings.map((f) => (
                  <li key={f.id}>
                    <b>{KIND_KO[f.kind]}</b>
                    {/* ★ 누가 줬는지 (§2.8-14) — 못 읽으면 '집사'로 폴백 */}
                    <span>{(f.giver ?? '집사')} · {agoKo(f.fed_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="notice">{COPY.noFeedRecord}</p>
            )}
            <p className="notice">{COPY.feedRecordCaveat}</p>

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
              <div className="bb-value">{agoKo(cat.last_fed_at) ?? '기록 없음'}</div>
            </div>
            <div className="bb-actions">
              <button className="bb-btn bb-btn-line" onClick={openSightMap}>여기서 봤어요</button>
              <button className="bb-btn" onClick={openPicker} disabled={saving}>
                {saving ? '기록 중…' : '밥 주기'}
              </button>
            </div>
          </div>

          {pickerOpen && (
            <div className="dp-feed-backdrop" onClick={() => setPickerOpen(false)}>
              <div className="dp-feed-sheet" onClick={(e) => e.stopPropagation()}>
                {KIND_ORDER.map((k) => (
                  <button key={k} className="dp-feed-opt" onClick={() => handleFeed(k)}>
                    {KIND_KO[k]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sightOpen && (
            <div className="dp-sight-backdrop" onClick={closeSightMap}>
              <div className="dp-sight-sheet" onClick={(e) => e.stopPropagation()}>
                {sightDone ? (
                  <div className="dp-sight-done">
                    <p className="dp-sight-done-msg">{COPY.sightingRecorded}</p>
                    <button className="dp-sight-submit" onClick={closeSightMap}>닫기</button>
                  </div>
                ) : (
                  <>
                    <div className="dp-sight-head">여기서 봤어요?</div>
                    <div className="rf-map">
                      {sightCenter && (
                        <Map
                          center={sightCenter} level={3}
                          style={{ width: '100%', height: '100%' }}
                          onCreate={(m) => { sightMapRef.current = m; }}
                        />
                      )}
                      <div className="rf-pin" aria-hidden>📍</div>
                    </div>
                    <span className="rf-hint">{COPY.blurNotice}</span>
                    {sightError && (
                      <div className="pf-upload-status pf-upload-error">{sightError}</div>
                    )}
                    <div className="dp-sight-actions">
                      <button className="dp-sight-cancel" onClick={closeSightMap}>취소</button>
                      <button
                        className="dp-sight-submit" onClick={submitSighting}
                        disabled={sightSaving || !sightCenter}
                      >
                        {sightSaving ? '기록 중…' : '확인'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
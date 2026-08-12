import { useEffect, useRef, useState } from 'react';
import { Map } from 'react-kakao-maps-sdk';
import { Bookmark } from 'lucide-react';
import CatPhoto from './CatPhoto';
import { fetchCatDetail, fetchCampus } from '../api/cats';
import { addFeeding, isTooSoon } from '../api/feedings';
import { addSighting } from '../api/sightings';
import { uploadSightingPhoto } from '../api/photos';
import { sanitizeImage } from '../lib/image';
import { toggleBookmark, isBookmarked } from '../api/bookmarks';
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
  const [bookmarked, setBookmarked] = useState(false);

  const [sightOpen, setSightOpen] = useState(false);
  const [sightCenter, setSightCenter] = useState(null);
  const [sightSaving, setSightSaving] = useState(false);
  const [sightError, setSightError] = useState(null);
  const [sightDone, setSightDone] = useState(false);
  const sightMapRef = useRef(null);   // 제출 시점에 지도 중심을 읽는다 (CatRegisterForm 과 같은 패턴)

  const [sightFile, setSightFile] = useState(null);
  const [sightPreview, setSightPreview] = useState(null);
  const [sightPhotoBusy, setSightPhotoBusy] = useState(false);
  const [sightPhotoError, setSightPhotoError] = useState(null);

  // 미리보기 URL은 다음 파일로 교체되거나 시트가 닫힐 때 해제한다 (PhotoField.jsx와 같은 패턴)
  useEffect(() => () => {
    if (sightPreview) URL.revokeObjectURL(sightPreview);
  }, [sightPreview]);

  useEffect(() => {
    setCat(null);
    setPickerOpen(false);
    setSightOpen(false);
    if (!catId) return;
    let alive = true;
    fetchCatDetail(catId).then((d) => alive && setCat(d)).catch(console.error);
    return () => { alive = false; };
  }, [catId]);

  // 북마크 초기 상태 (§2.12) — 상세 페이지가 자립형으로 유지되도록 별도 effect로 분리
  useEffect(() => {
    setBookmarked(false);
    if (!catId || !loggedIn) return;
    let alive = true;
    isBookmarked(catId).then((b) => { if (alive) setBookmarked(b); }).catch(console.error);
    return () => { alive = false; };
  }, [catId, loggedIn]);

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

  // 북마크 원탭 (§2.12) — 낙관적 업데이트, 실패 시 롤백. soft-delete 아니고 실제 DELETE다.
  async function handleBookmarkToggle() {
    if (!loggedIn) { openAuth(COPY.writeLocked); return; }
    const prev = bookmarked;
    setBookmarked(!prev);
    try {
      await toggleBookmark(catId, prev);
    } catch (e) {
      setBookmarked(prev);
      console.error(e);
    }
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
    setSightFile(null);
    setSightPreview(null);
    setSightPhotoBusy(false);
    setSightPhotoError(null);
  }

  // 목격 사진은 이 시점에 업로드하지 않는다 — 미리보기만 만들고, 실제 업로드는 제출 시(submitSighting)
  async function handleSightPhotoChange(e) {
    const picked = e.target.files?.[0];
    e.target.value = '';   // 같은 파일을 다시 골라도 onChange가 또 뜨게
    if (!picked) return;

    setSightPhotoError(null);
    setSightFile(null);
    setSightPreview(null);
    setSightPhotoBusy(true);
    try {
      const { blob } = await sanitizeImage(picked);   // 원칙 4 — EXIF 제거를 통과한 결과만 미리보기로
      setSightFile(picked);
      setSightPreview(URL.createObjectURL(blob));
    } catch (err) {
      setSightPhotoError(err.message || String(err));
    } finally {
      setSightPhotoBusy(false);
    }
  }

  async function submitSighting() {
    const c = sightMapRef.current?.getCenter();
    if (!c) { setSightError('지도를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.'); return; }

    setSightSaving(true);
    setSightError(null);
    try {
      let photoPath = null;
      if (sightFile) photoPath = (await uploadSightingPhoto(sightFile, { catId })).path;
      await addSighting({ catId, lat: c.getLat(), lng: c.getLng(), photoPath });
      setSightDone(true);
      // ★ 목격의 좌표·시간 표시는 일부러 다시 안 맞춘다 — cats_full 은 security_invoker 가 꺼져 있어
      //   재조회해도 1시간 지연이 뷰 단에서 그대로 유지된다(§2.3, 비협상). 여기서 재조회하는 건
      //   방금 올린 사진을 "다른 사진들" 갤러리에 바로 반영하기 위해서일 뿐이다.
      if (photoPath) { const d = await fetchCatDetail(catId); setCat(d); }
    } catch (e) {
      setSightError(e.message || String(e));
    } finally {
      setSightSaving(false);
    }
  }

  return (
    <div className={`detail-page ${catId ? 'show' : ''}`}>
      <button className="back-btn" onClick={onClose} aria-label="닫기">←</button>
      <button
        className={`dp-bookmark-btn ${bookmarked ? 'is-on' : ''}`}
        onClick={handleBookmarkToggle}
        aria-label={bookmarked ? '북마크 해제' : '북마크'}
      >
        <Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} />
      </button>

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
                    {/* ★ 누가 줬는지 (§2.8-14). giver_id가 없으면 탈퇴로 CASCADE된 것 —
                        일반 폴백('집사')과 구분해 보여준다. */}
                    <span>
                      {f.giver ?? (f.giver_id ? '집사' : COPY.deletedGiver)} · {agoKo(f.fed_at)}
                    </span>
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

                    <label className={`dp-sight-photo-picker ${sightPhotoBusy ? 'is-busy' : ''}`}>
                      <input
                        type="file" accept="image/*"
                        onChange={handleSightPhotoChange} disabled={sightPhotoBusy}
                      />
                      {sightPhotoBusy ? '변환 중…' : '사진 추가 (선택)'}
                    </label>
                    {sightPhotoError && (
                      <div className="pf-upload-status pf-upload-error">{sightPhotoError}</div>
                    )}
                    {sightPreview && (
                      <div className="dp-sight-photo-preview">
                        <img src={sightPreview} alt="목격 사진 미리보기" />
                      </div>
                    )}

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
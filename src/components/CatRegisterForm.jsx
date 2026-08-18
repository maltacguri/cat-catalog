import { useEffect, useRef, useState } from 'react';
import { Map } from 'react-kakao-maps-sdk';
import { ChevronDown } from 'lucide-react';
import PhotoField from './PhotoField';
import { createCat } from '../api/cats';
import {
  COLOR_ORDER, COLOR_KO, SEX_KO, NEUTERED_KO, NEUTERED_TO_DB, COPY,
} from '../lib/format';

/**
 * 3단 — 고양이 등록 폼 (§2.11). CatDetailPage 와 같은 오버레이 패턴, 라우트 없음(§2.10).
 *
 * 입력 순서(번호): 대표사진(맨 위, 번호 없음) → 1.이름 → 2.색 → 3.성별 → 4.중성화 → 5.특이사항 → 6.위치
 * 위치는 폼 안 미니 지도의 "중심 고정 핀"으로 찍는다. 저장 직전 50m 라운딩(§2.3, createCat).
 *
 * props:
 *   open          열림 여부
 *   onClose       닫기
 *   initialCenter 미니 지도 초기 중심 {lat,lng} — MapPage 가 현재 지도 중심을 넘긴다
 *   onCreated     등록 성공 콜백 — 부모가 지도 데이터를 다시 불러온다
 */
const SEX_OPTIONS = ['unknown', 'male', 'female'];       // 기본 모름
const NEUTERED_OPTIONS = ['unknown', 'yes', 'no'];       // 기본 모름(NULL)
const FALLBACK_CENTER = { lat: 37.5509, lng: 126.9410 }; // initialCenter 없을 때만(홍대 부근)

export default function CatRegisterForm({ open, onClose, initialCenter, onCreated }) {
  const [coverPath, setCoverPath] = useState(null);   // PhotoField 업로드 완료 시 채워짐
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(null);
  const [colorOpen, setColorOpen] = useState(false);  // 색 아코디언 열림 여부
  const [sex, setSex] = useState('unknown');
  const [neutered, setNeutered] = useState('unknown');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const mapRef = useRef(null);   // 제출 시점에 지도 중심을 읽는다

  // 오버레이 슬라이드(0.35s) 중 지도가 마운트되면 카카오가 타일을 어긋나게 그린다 → 끝난 뒤 relayout
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => mapRef.current?.relayout(), 400);
    return () => clearTimeout(t);
  }, [open]);

  // 필수 3종(§2.11): 대표사진 업로드 완료 · 이름 · 색. (위치는 지도에 항상 중심이 있어 자동 충족)
  const canSubmit = !!coverPath && name.trim() !== '' && !!color && !submitting;

  const missing = [
    !coverPath && '대표 사진',
    name.trim() === '' && '이름',
    !color && '색',
  ].filter(Boolean);

  function reset() {
    setCoverPath(null); setName(''); setDescription('');
    setColor(null); setColorOpen(false); setSex('unknown'); setNeutered('unknown');
    setSubmitting(false); setError(null); setDone(false);
  }
  function close() { reset(); onClose(); }

  async function handleSubmit() {
    if (!canSubmit) return;
    const c = mapRef.current?.getCenter();
    if (!c) { setError('지도를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.'); return; }

    setSubmitting(true); setError(null);
    try {
      await createCat({
        coverPath, name, description, color, sex,
        neutered: NEUTERED_TO_DB[neutered],   // yes/no/unknown → true/false/null
        lat: c.getLat(), lng: c.getLng(),
      });
      setDone(true);
      onCreated?.();                          // 부모가 fetchCatsForMap 다시 호출
    } catch (err) {
      setError(err.message || String(err));
      setSubmitting(false);
    }
  }

  const center = initialCenter ?? FALLBACK_CENTER;

  return (
    <div className={`register-page ${open ? 'show' : ''}`}>
      <div className="rf-header">
        <button className="rf-back" onClick={close} aria-label="닫기">←</button>
        <div className="rf-title">냥이 등록하기</div>
      </div>

      <div className="rf-body">
        {done ? (
          <div className="rf-done">
            <div className="rf-done-title">등록 완료 🐾</div>
            <p className="rf-done-msg">{COPY.sightingSaved}</p>
            <p className="rf-done-sub">지도에는 목격이 공개되는 약 1시간 뒤부터 핀이 떠요.</p>
            <button className="rf-submit" onClick={close}>지도로 돌아가기</button>
          </div>
        ) : (
          <>
            {/* 대표 사진 — 맨 위, 번호 없음 (업로드 끝나야 coverPath 올라옴, §2.4) */}
            <div className="rf-field">
              <span className="rf-label">대표 사진 <em className="req">*</em></span>
              <span className="rf-sublabel">한 장은 꼭 필요해요. 다른 사람들도 고양이를 잘 알아볼 수 있는 사진을 선택해 주세요.</span>
              <div className="rf-photo">
                <PhotoField onCoverReady={setCoverPath} />
              </div>
            </div>

            {/* 1. 이름 */}
            <label className="rf-field">
              <span className="rf-label">1. 이름 <em className="req">*</em></span>
              <input
                className="rf-input" value={name} maxLength={20}
                onChange={(e) => setName(e.target.value)} placeholder="예: 치즈"
              />
            </label>

            {/* 2. 색 — 아코디언 */}
            <div className="rf-field">
              <span className="rf-label">2. 색 <em className="req">*</em></span>
              <div className="rf-acc">
                <button
                  type="button"
                  className={`rf-acc-head ${color ? 'picked' : ''}`}
                  onClick={() => setColorOpen((o) => !o)}
                  aria-expanded={colorOpen}
                >
                  <span>{color ? COLOR_KO[color] : '색을 선택하세요'}</span>
                  <ChevronDown size={18} className={`rf-acc-chev ${colorOpen ? 'open' : ''}`} />
                </button>
                {colorOpen && (
                  <div className="rf-acc-body">
                    {COLOR_ORDER.map((slug) => (
                      <button
                        key={slug} type="button"
                        className={`rf-acc-item ${color === slug ? 'on' : ''}`}
                        onClick={() => { setColor(slug); setColorOpen(false); }}
                      >{COLOR_KO[slug]}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3. 성별 */}
            <div className="rf-field">
              <span className="rf-label">3. 성별</span>
              <div className="rf-chips">
                {SEX_OPTIONS.map((v) => (
                  <button
                    key={v} type="button"
                    className={`rf-chip ${sex === v ? 'on' : ''}`}
                    onClick={() => setSex(v)}
                  >{v === 'unknown' ? '모름' : SEX_KO[v]}</button>
                ))}
              </div>
            </div>

            {/* 4. 중성화 */}
            <div className="rf-field">
              <span className="rf-label">4. 중성화</span>
              <div className="rf-chips">
                {NEUTERED_OPTIONS.map((v) => (
                  <button
                    key={v} type="button"
                    className={`rf-chip ${neutered === v ? 'on' : ''}`}
                    onClick={() => setNeutered(v)}
                  >{NEUTERED_KO[v]}</button>
                ))}
              </div>
            </div>

            {/* 5. 특이사항 */}
            <label className="rf-field">
              <span className="rf-label">5. 특이사항</span>
              {/* §2.11 — 감상문 말고 '알아볼 수 있는 특징'을 유도하는 안내 카피 */}
              <textarea
                className="rf-input rf-textarea" value={description} rows={3} maxLength={200}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="이 고양이를 알아볼 수 있는 특징을 적어주세요 (귀 모양, 무늬, 성격 등)"
              />
            </label>

            {/* 6. 위치 */}
            <div className="rf-field">
              <span className="rf-label">6. 위치 <em className="req">*</em></span>
              <span className="rf-sublabel">지도를 움직여 고양이를 본 곳에 핀을 맞춰주세요</span>
              <div className="rf-map">
                {open && (
                  <Map
                    center={center} level={3}
                    style={{ width: '100%', height: '100%' }}
                    onCreate={(m) => { mapRef.current = m; }}
                  />
                )}
                {/* 고정 핀 — 지도가 그 아래에서 움직인다. 제출 때 지도 중심을 읽는다 */}
                <div className="rf-pin" aria-hidden>📍</div>
              </div>
              <span className="rf-hint">{COPY.blurNotice}</span>
            </div>

            {error && (
              <div className="pf-upload-status pf-upload-error">등록 실패: {error}</div>
            )}
          </>
        )}
      </div>

      {!done && (
        <div className="rf-footer">
          <button className="rf-submit" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? '등록 중…' : '등록하기'}
          </button>
          {missing.length > 0 && (
            <p className="rf-hint">{missing.join(' · ')}을 채워주세요</p>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useSession } from '../api/auth';
import { useAppUI } from '../components/AppUI';
import { fetchCatsForMap } from '../api/cats';
import CatPhoto from '../components/CatPhoto';
import { COLOR_ORDER, COLOR_KO, SEX_KO } from '../lib/format';

/**
 * 주변 고양이 도감 (§2.7-5 · §3-18). 도감 = 이 화면. 로그인 전용(탭이 게스트 잠금).
 * 데이터는 cats_full 전체 행 — 지도와 달리 last_lat 필터 없이 다 나열(위치 지연/없는 애도 목록엔 뜬다).
 * 검색축은 3개뿐: 색(다중) · 성별(다중) · 이름 텍스트. (traits 폐기라 이 셋만 남음)
 *
 * 2026-09-14 레이아웃 변경 — 72px 썸네일 세로 리스트에서 2열 카드 격자로.
 * 데이터·필터 로직은 그대로다. 바뀐 건 표시 방식뿐.
 */
const SEX_FILTERS = ['male', 'female', 'unknown']; // 등록 폼과 같은 값

// 격자가 홀수로 끝나 허전한 걸 메우는 장식용 빈 칸. 최소 이만큼은 채워 보인다.
// ⚠️ '미발견' 같은 상태가 아니다 — DB에 그런 개념이 없다. 누르면 등록으로 간다.
const MIN_GRID_CELLS = 6;

/** 아무것도 못 찾았을 때. 부산대 3마리라 신규 사용자가 실제로 자주 보는 화면이다. */
function EmptyArt() {
  return (
    <svg className="nearby-empty-art" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <g stroke="#3A5A40" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {/* 웅크린 고양이 실루엣 — 등선 하나, 귀 둘, 꼬리 하나 */}
        <path d="M22 68c0-14 8-24 20-24s20 10 20 24" fill="#D7E0CC" />
        <path d="M26 47l-3-12 11 6M58 47l3-12-11 6" fill="#D7E0CC" />
        <path d="M62 68c8 0 12-5 12-11" />
        <path d="M22 68h40" />
      </g>
      <g fill="#3A5A40">
        <circle cx="36" cy="55" r="1.8" />
        <circle cx="48" cy="55" r="1.8" />
      </g>
      <path d="M42 60c0 1.4-1.3 2.2-2.6 1.5M42 60c0 1.4 1.3 2.2 2.6 1.5"
        stroke="#3A5A40" strokeWidth="2" strokeLinecap="round" />
      {/* 아직 비어 있다는 표시 — 점선 원 */}
      <circle cx="74" cy="26" r="9" stroke="#C0842A" strokeWidth="2"
        strokeDasharray="3 4" fill="none" />
    </svg>
  );
}

export default function NearbyPage() {
  const navigate = useNavigate();
  const { loggedIn } = useSession();
  const { openAuth, openDetail } = useAppUI();

  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState('');                        // 이름 검색어
  const [colors, setColors] = useState(() => new Set()); // 선택된 색 슬러그
  const [sexes, setSexes] = useState(() => new Set());   // 선택된 성별

  // 필터를 눌러 목록이 바뀔 때 카드가 뚝뚝 갈아끼워지지 않게 한다. 부모에 ref 하나뿐.
  const [gridRef] = useAutoAnimate();

  useEffect(() => {
    if (!loggedIn) { setLoading(false); return; }
    let alive = true;
    setLoading(true); setError(null);
    fetchCatsForMap(true)
      .then((rows) => { if (alive) setCats(rows ?? []); })
      .catch((e) => { if (alive) setError(e.message || String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [loggedIn]);

  function toggle(setFn, value) {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  }

  function goRegister() {
    navigate('/', { state: { openRegister: true } });
  }

  // 아무 필터도 안 고르면 전체. 색·성별은 OR, 이름은 부분일치.
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cats.filter((c) => {
      if (colors.size && !colors.has(c.color)) return false;
      if (sexes.size && !sexes.has(c.sex ?? 'unknown')) return false;
      if (needle && !(c.name ?? '').toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [cats, q, colors, sexes]);

  const filtering = q.trim() !== '' || colors.size > 0 || sexes.size > 0;
  // 빈 칸은 '아직 안 채워진 도감'을 보여주는 장식이라, 필터 중일 때는 띄우지 않는다.
  const slotCount = filtering ? 0 : Math.max(0, MIN_GRID_CELLS - shown.length);

  // 게스트가 URL로 직접 들어온 경우 방어 (탭은 잠겨 있지만)
  if (!loggedIn) {
    return (
      <div className="nearby nearby-gate">
        <p>주변 고양이 도감은 로그인해야 볼 수 있어요.</p>
        <button className="nearby-register" onClick={() => openAuth()}>로그인하기</button>
      </div>
    );
  }

  return (
    <div className="nearby">
      <header className="nearby-head">
        <h1 className="nearby-title">주변 고양이 도감</h1>
        {/* 임시 — 지도로 보내 +로 등록하게 한다. 실제 폼 오픈/확인 다이얼로그는 '등록 확인 단계 연결'에서 */}
        <button className="nearby-register" onClick={goRegister}>
          <Plus size={16} /> 새로 등록하기
        </button>
      </header>

      {!loading && !error && cats.length > 0 && (
        <p className="nearby-count">
          지금까지 <b>{cats.length}마리</b>를 모았어요
          {filtering && ` · ${shown.length}마리 보는 중`}
        </p>
      )}

      <div className="nearby-search">
        <Search size={16} />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="이름으로 찾기" maxLength={20}
        />
      </div>

      <div className="nearby-filter">
        {COLOR_ORDER.map((slug) => (
          <button
            key={slug}
            className={`nearby-chip ${colors.has(slug) ? 'on' : ''}`}
            aria-pressed={colors.has(slug)}
            onClick={() => toggle(setColors, slug)}
          >{COLOR_KO[slug]}</button>
        ))}
      </div>

      <div className="nearby-filter">
        {SEX_FILTERS.map((v) => (
          <button
            key={v}
            className={`nearby-chip ${sexes.has(v) ? 'on' : ''}`}
            aria-pressed={sexes.has(v)}
            onClick={() => toggle(setSexes, v)}
          >{v === 'unknown' ? '성별 모름' : SEX_KO[v]}</button>
        ))}
      </div>

      {loading ? (
        <p className="nearby-empty">불러오는 중…</p>
      ) : error ? (
        <p className="nearby-empty">불러오기 실패: {error}</p>
      ) : shown.length === 0 ? (
        <div className="nearby-empty">
          <EmptyArt />
          {cats.length === 0 ? (
            <>
              <b className="nearby-empty-title">도감이 아직 비어 있어요</b>
              <p>
                캠퍼스에서 마주친 고양이를 첫 번째로 등록해 보세요.<br />
                한 마리씩 쌓이면 도감이 됩니다.
              </p>
              <button className="nearby-register" onClick={goRegister}>
                <Plus size={16} /> 첫 고양이 등록하기
              </button>
            </>
          ) : (
            <>
              <b className="nearby-empty-title">조건에 맞는 고양이가 없어요</b>
              <p>색이나 성별 조건을 줄여보면 더 보일 거예요.</p>
            </>
          )}
        </div>
      ) : (
        <ul className="nearby-grid" ref={gridRef}>
          {shown.map((c) => (
            <li key={c.id}>
              <button type="button" className="nearby-card" onClick={() => openDetail(c.id)}>
                <div className="nearby-thumb">
                  <CatPhoto path={c.cover_path} kind="cover" alt={c.name} />
                  {/* 로드맵 §2.11 — "번호에 큰 의미를 두지 않는다". 작게, 구석에만 */}
                  {c.code && <span className="nearby-code">No.{c.code}</span>}
                </div>
                <div className="nearby-meta">
                  <div className="nearby-name">{c.name}</div>
                  <div className="nearby-tags">
                    <span className="nearby-tag">{COLOR_KO[c.color] ?? '기타'}</span>
                    {c.sex && c.sex !== 'unknown' && (
                      <span className="nearby-tag">{SEX_KO[c.sex]}</span>
                    )}
                  </div>
                  {c.description && <p className="nearby-desc">{c.description}</p>}
                </div>
              </button>
            </li>
          ))}

          {Array.from({ length: slotCount }, (_, i) => (
            <li key={`slot-${i}`}>
              <button
                type="button" className="nearby-slot" onClick={goRegister}
                aria-label="고양이 등록하기"
              >
                <Plus size={20} aria-hidden="true" />
                <span>비어 있어요</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

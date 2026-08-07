import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { useSession } from '../api/auth';
import { useAppUI } from '../components/AppUI';
import { fetchCatsForMap } from '../api/cats';
import CatPhoto from '../components/CatPhoto';
import { COLOR_ORDER, COLOR_KO, SEX_KO } from '../lib/format';

/**
 * 주변 고양이 도감 (§2.7-5 · §3-18). 도감 = 이 화면. 로그인 전용(탭이 게스트 잠금).
 * 데이터는 cats_full 전체 행 — 지도와 달리 last_lat 필터 없이 다 나열(위치 지연/없는 애도 목록엔 뜬다).
 * 검색축은 3개뿐: 색(다중) · 성별(다중) · 이름 텍스트. (traits 폐기라 이 셋만 남음)
 */
const SEX_FILTERS = ['male', 'female', 'unknown']; // 등록 폼과 같은 값

export default function NearbyPage() {
  const navigate = useNavigate();
  const { loggedIn } = useSession();
  const { openAuth } = useAppUI();

  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState('');                        // 이름 검색어
  const [colors, setColors] = useState(() => new Set()); // 선택된 색 슬러그
  const [sexes, setSexes] = useState(() => new Set());   // 선택된 성별

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
    <div className="nearby">j
      <header className="nearby-head">
        <h1 className="nearby-title">주변 고양이 도감</h1>
        {/* 임시 — 지도로 보내 +로 등록하게 한다. 실제 폼 오픈/확인 다이얼로그는 '등록 확인 단계 연결'에서 */}
        <button className="nearby-register" onClick={() => navigate('/', { state: { openRegister: true } })}>
          <Plus size={16} /> 새로 등록하기
        </button>
      </header>

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
            onClick={() => toggle(setColors, slug)}
          >{COLOR_KO[slug]}</button>
        ))}
      </div>

      <div className="nearby-filter">
        {SEX_FILTERS.map((v) => (
          <button
            key={v}
            className={`nearby-chip ${sexes.has(v) ? 'on' : ''}`}
            onClick={() => toggle(setSexes, v)}
          >{v === 'unknown' ? '성별 모름' : SEX_KO[v]}</button>
        ))}
      </div>

      {loading ? (
        <p className="nearby-empty">불러오는 중…</p>
      ) : error ? (
        <p className="nearby-empty">불러오기 실패: {error}</p>
      ) : shown.length === 0 ? (
        <p className="nearby-empty">
          {cats.length === 0 ? '아직 등록된 고양이가 없어요.' : '조건에 맞는 고양이가 없어요.'}
        </p>
      ) : (
        <ul className="nearby-list">
          {/* 상세 드릴인은 아직 안 붙임 — CatDetailPage가 MapPage 오버레이라, 상세 마무리 때 연결 */}
          {shown.map((c) => (
            <li key={c.id} className="nearby-item">
              <div className="nearby-thumb">
                <CatPhoto path={c.cover_path} kind="cover" alt={c.name} />
              </div>
              <div className="nearby-meta">
                <div className="nearby-name">{c.name}</div>
                <div className="nearby-tags">
                  <span>{COLOR_KO[c.color] ?? '기타'}</span>
                  {c.sex && c.sex !== 'unknown' && <span> · {SEX_KO[c.sex]}</span>}
                </div>
                {c.description && <p className="nearby-desc">{c.description}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
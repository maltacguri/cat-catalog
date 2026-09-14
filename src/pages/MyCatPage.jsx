// 마이캣 (§2.12) — 북마크 · 내가 등록 · 밥 준 적 있음, 세 집합을 고양이 하나당 카드 하나로 합친다.
//
// 2026-09-14 — 도감(NearbyPage)과 같은 2열 카드 격자를 쓴다. 원래는 `.nearby-list`/`.nearby-item`을
// 빌려 쓰는 가로 행이었는데, 도감을 격자로 바꾸면서 그 클래스들이 사라져 여기만 깨졌다.
// 같은 내용(사진·이름·색·성별)이므로 클래스를 빌리는 대신 같은 레이아웃으로 맞춘다.
import { useEffect, useMemo, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useSession, fetchMyProfile } from '../api/auth';
import { useAppUI } from '../components/AppUI';
import { fetchCatsForMap } from '../api/cats';
import { fetchMyBookmarks } from '../api/bookmarks';
import { fetchMyFeedTouches } from '../api/feedings';
import CatPhoto from '../components/CatPhoto';
import { COLOR_KO, SEX_KO } from '../lib/format';

const FILTERS = ['all', 'bookmarked', 'mine', 'fed'];
const FILTER_KO = { all: '전체', bookmarked: '북마크', mine: '내가 등록', fed: '밥 준 적 있음' };

export default function MyCatPage() {
  const { loggedIn } = useSession();
  const { openAuth, openDetail } = useAppUI();

  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  // 필터를 눌러 목록이 바뀔 때 카드가 뚝뚝 갈아끼워지지 않게 한다 (도감과 같다)
  const [gridRef] = useAutoAnimate();

  useEffect(() => {
    if (!loggedIn) { setLoading(false); return; }
    let alive = true;
    setLoading(true); setError(null);

    (async () => {
      try {
        const [profile, allCats, bookmarks, feedTouches] = await Promise.all([
          fetchMyProfile(),
          fetchCatsForMap(true),
          fetchMyBookmarks(),
          fetchMyFeedTouches(),
        ]);
        const myId = profile?.id;

        const bookmarkedAt = Object.fromEntries(bookmarks.map((b) => [b.cat_id, b.created_at]));

        const ids = new Set([
          ...Object.keys(bookmarkedAt),
          ...allCats.filter((c) => c.created_by === myId).map((c) => c.id),
          ...Object.keys(feedTouches),
        ]);

        const merged = [...ids]
          .map((id) => allCats.find((c) => c.id === id))
          .filter(Boolean)
          .map((cat) => {
            const isBookmarked = cat.id in bookmarkedAt;
            const isMine = cat.created_by === myId;
            const hasFed = cat.id in feedTouches;
            const touches = [
              isBookmarked ? bookmarkedAt[cat.id] : null,
              isMine ? cat.created_at : null,
              hasFed ? feedTouches[cat.id] : null,
            ].filter(Boolean).map((t) => new Date(t).getTime());
            return {
              ...cat, isBookmarked, isMine, hasFed,
              myLastTouchedAt: touches.length ? Math.max(...touches) : 0,
            };
          })
          .sort((a, b) => b.myLastTouchedAt - a.myLastTouchedAt);

        if (alive) setCats(merged);
      } catch (e) {
        if (alive) setError(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [loggedIn]);

  const shown = useMemo(() => {
    if (filter === 'bookmarked') return cats.filter((c) => c.isBookmarked);
    if (filter === 'mine') return cats.filter((c) => c.isMine);
    if (filter === 'fed') return cats.filter((c) => c.hasFed);
    return cats;
  }, [cats, filter]);

  // /mycat 은 잠금 탭이지만 주소창 직접 입력을 막는 라우트 가드가 없다 (MePage와 같은 패턴, (26)차)
  if (!loggedIn) {
    return (
      <div className="mycat-gate">
        <p>마이캣은 로그인해야 볼 수 있어요.</p>
        <button className="mycat-login" onClick={() => openAuth()}>로그인하기</button>
      </div>
    );
  }

  return (
    <div className="mycat">
      <header className="mycat-head">
        <h1 className="mycat-title">마이캣</h1>
      </header>

      <div className="nearby-filter">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`nearby-chip ${filter === f ? 'on' : ''}`}
            onClick={() => setFilter(f)}
          >{FILTER_KO[f]}</button>
        ))}
      </div>

      {loading ? (
        <p className="nearby-empty">불러오는 중…</p>
      ) : error ? (
        <p className="nearby-empty">불러오기 실패: {error}</p>
      ) : shown.length === 0 ? (
        <p className="nearby-empty">아직 기록된 고양이가 없어요.</p>
      ) : (
        <ul className="nearby-grid" ref={gridRef}>
          {shown.map((c) => (
            <li key={c.id}>
              <button type="button" className="nearby-card" onClick={() => openDetail(c.id)}>
                <div className="nearby-thumb">
                  <CatPhoto path={c.cover_path} kind="cover" alt={c.name} />
                </div>
                <div className="nearby-meta">
                  <div className="nearby-name">{c.name}</div>
                  <div className="nearby-tags">
                    <span className="nearby-tag">{COLOR_KO[c.color] ?? '기타'}</span>
                    {c.sex && c.sex !== 'unknown' && (
                      <span className="nearby-tag">{SEX_KO[c.sex]}</span>
                    )}
                  </div>
                  {/* 왜 내 목록에 있는지 — 세 집합이 겹칠 수 있어 배지가 여러 개 붙는다 */}
                  <div className="mycat-badges">
                    {c.isBookmarked && <span className="mycat-badge">북마크</span>}
                    {c.isMine && <span className="mycat-badge">내가 등록</span>}
                    {c.hasFed && <span className="mycat-badge">밥 줌</span>}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

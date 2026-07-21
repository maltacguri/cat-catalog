import { useEffect, useMemo, useState } from 'react';
import { Map, CustomOverlayMap, Circle, useKakaoLoader } from 'react-kakao-maps-sdk';

import { fetchCampus, fetchCatsForMap } from '../api/cats';
import { useSession } from '../api/auth';
import { GRID_RADIUS_M } from '../lib/geo';
import { COPY } from '../lib/format';
import { useAppUI } from '../components/AppUI';          // ★
import CatFloatingCard from '../components/CatFloatingCard';
import CatDetailPage from '../components/CatDetailPage';

export default function MapPage() {
  const [kakaoLoading, kakaoError] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_KEY,
  });

  const { loggedIn } = useSession();
  const { setBarHidden, openAuth } = useAppUI();          // ★ 시트는 AppLayout이 그린다

  const [campus, setCampus] = useState(null);
  const [cats, setCats] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [error, setError] = useState(null);

  // 로그인 상태가 바뀌면 읽는 뷰가 달라지므로 다시 불러온다 (§2.2)
  useEffect(() => {
    (async () => {
      try {
        const c = campus ?? (await fetchCampus());
        setCampus(c);
        setCats(await fetchCatsForMap(loggedIn));
      } catch (e) {
        console.error(e);
        setError('데이터를 불러오지 못했어요. Supabase 연결과 시드 데이터를 확인해 주세요.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  // ★ 카드가 올라오면 하단 바를 내린다 (앱플로우 §6)
  useEffect(() => { setBarHidden(selectedId != null); }, [selectedId, setBarHidden]);
  // ★ 다른 탭으로 나갈 때 바를 되돌린다
  useEffect(() => () => setBarHidden(false), [setBarHidden]);

  // 마지막 목격 좌표가 있는 고양이만 지도에 올린다.
  // 1시간이 안 지난 목격은 DB 가 이미 걸러서 last_lat 이 null 로 온다 (§2.3)
  const pins = useMemo(
    () => cats
      .filter((c) => c.last_lat != null && c.last_lng != null)
      .map((c) => ({ cat: c, pos: { lat: c.last_lat, lng: c.last_lng } })),
    [cats]
  );

  const selected = cats.find((c) => c.id === selectedId) ?? null;

  // 플로팅 카드(1단) → 상세(2단)는 로그인 게이트 (§2.2)
  function openDetail() {
    if (!selected) return;
    if (!loggedIn) { openAuth(COPY.detailLocked); return; }   // ★
    setDetailId(selected.id);
  }

  if (kakaoError) {
    return (
      <div className="center-note">
        카카오맵을 불러오지 못했어요.<br />
        .env 의 VITE_KAKAO_MAP_KEY 와<br />
        카카오 개발자 콘솔의 플랫폼(Web) 도메인 등록을 확인해 주세요.
      </div>
    );
  }

  // ★ .phone 래퍼는 AppLayout으로 올라갔다
  return (
    <>
      <div className="map-host">
        {!kakaoLoading && campus && (
          <Map
            center={{ lat: campus.center_lat, lng: campus.center_lng }}
            level={3}
            style={{ width: '100%', height: '100%' }}
            onClick={() => setSelectedId(null)}
          >
            {/* 원은 장식이 아니라 안내다: "이 안 어딘가"라는 뜻 */}
            {pins.map(({ cat, pos }) => (
              <Circle
                key={`c-${cat.id}`}
                center={pos}
                radius={GRID_RADIUS_M}
                strokeWeight={1}
                strokeColor="#3A5A40"
                strokeOpacity={0.3}
                fillColor="#3A5A40"
                fillOpacity={0.07}
              />
            ))}

            {pins.map(({ cat, pos }) => (
              <CustomOverlayMap key={cat.id} position={pos} yAnchor={1} zIndex={2}>
                <svg
                  className={`pin ${selectedId === cat.id ? 'selected' : ''}`}
                  viewBox="0 0 46 56"
                  onClick={(e) => { e.stopPropagation(); setSelectedId(cat.id); }}
                >
                  <path d="M23 55C23 55 42 34 42 21A19 19 0 1 0 4 21C4 34 23 55 23 55Z" fill="#222" />
                  <circle cx="23" cy="20" r="14" fill="#fff" />
                  <circle cx="23" cy="21" r="9.5" fill="#E8A94C" />
                </svg>
              </CustomOverlayMap>
            ))}
          </Map>
        )}
        {error && <div className="center-note">{error}</div>}
      </div>

      <div className="topbar">
        <div className="searchpill">
          <div>🐱 {campus ? `도감에 ${cats.length}마리` : '불러오는 중'}</div>
          {!loggedIn && (
            <button className="btn-ghost" onClick={() => openAuth()}>로그인</button>
          )}
        </div>
      </div>

      <CatFloatingCard cat={selected} onOpen={openDetail} />
      <CatDetailPage catId={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}
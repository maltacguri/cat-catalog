import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';        // ★ 추가
import { Map, CustomOverlayMap, Circle, useKakaoLoader } from 'react-kakao-maps-sdk';
import { Plus } from 'lucide-react';

import { fetchCampus, fetchCatsForMap } from '../api/cats';
import { useSession } from '../api/auth';
import { GRID_RADIUS_M } from '../lib/geo';
import { COPY } from '../lib/format';
import { useAppUI } from '../components/AppUI';          // ★
import CatFloatingCard from '../components/CatFloatingCard';
import CatRegisterForm from '../components/CatRegisterForm';
import RegisterConfirm from '../components/RegisterConfirm';        // ★ 추가

const PAW_INK  = '#343434';
const PAW_PINK = '#F7ADAD';

export default function MapPage() {
  const [kakaoLoading, kakaoError] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_MAP_KEY,
  });

  const { loggedIn } = useSession();
  const { setBarHidden, openAuth, openDetail: openCatDetail } = useAppUI();          // ★ 시트·상세는 AppLayout이 그린다
  const location = useLocation();                          // ★ 도감에서 온 openRegister 플래그 읽기
  const navigate = useNavigate();                          // ★

  const [campus, setCampus] = useState(null);
  const [cats, setCats] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);       // ★ 등록 확인 단계(§2.11)
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerCenter, setRegisterCenter] = useState(null);  // 등록 폼 미니 지도 초기 중심
  const [error, setError] = useState(null);
  const [userPos, setUserPos] = useState(null);   // ★ 내 위치 점(정적) 표시용

  const mapRef = useRef(null);   // 지도 인스턴스 — 등록 시 현재 중심을 읽는다

  // ★ 초기 지도 중심을 사용자 현재 위치로 — 마운트당 1회만 시도.
  //   실패(권한 거부·타임아웃·미지원)해도 아무것도 하지 않는다 — 캠퍼스 중심이 그대로 폴백.
  //   좌표는 setCenter 호출 + userPos 표시에만 쓰고 버린다 (DB·localStorage 저장 없음). 게스트도 동일하게 동작.
useEffect(() => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }), 
    () => {},
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
  );
}, []);

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

  // ★ 도감 "새로 등록하기"에서 넘어온 경우 — 확인 다이얼로그 스킵하고 등록 폼 직행 (§2.11)
  //   campus 가 준비돼야 폼 미니 지도 폴백 중심이 잡히므로 campus 를 기다린다.
  useEffect(() => {
    if (loggedIn && campus && location.state?.openRegister) {
      openRegister();
      navigate('/', { replace: true, state: null });   // 뒤로가기·새로고침에 재발동 안 하게 플래그 비움
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, campus, location.state]);

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
    openCatDetail(selected.id);
  }

  // ★ + 버튼 → 등록 폼 전에 확인 단계 먼저 (§2.11). 로그인 게이트는 여기서 (§2.6·§2.8-12)
  function onPlus() {
    if (!loggedIn) { openAuth(COPY.writeLocked); return; }
    setConfirmOpen(true);
  }

  // 확인 다이얼로그 "네, 확인했어요" → 폼 열기. 도감에서 직행한 경우에도 이 함수를 바로 부른다.
  function openRegister() {
    if (!loggedIn) { openAuth(COPY.writeLocked); return; }
    // 지금 보고 있던 지도 중심을 등록 폼 미니 지도의 시작점으로 넘긴다 (없으면 캠퍼스 중심)
    const c = mapRef.current?.getCenter();
    setRegisterCenter(
      c ? { lat: c.getLat(), lng: c.getLng() }
        : (campus ? { lat: campus.center_lat, lng: campus.center_lng } : null)
    );
    setConfirmOpen(false);       // ★ 확인 → 폼 전환
    setRegisterOpen(true);
  }

  // 등록 성공 → 뷰를 다시 읽는다. 방금 만든 개체는 1시간 지연이라 핀은 아직 안 뜨지만,
  // cats 행은 잡히므로 "도감 N마리" 카운터는 바로 오른다 (§2.3)
  async function handleCreated() {
    try { setCats(await fetchCatsForMap(loggedIn)); } catch (e) { console.error(e); }
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
            center={userPos ?? { lat: campus.center_lat, lng: campus.center_lng }}
            level={3}
            style={{ width: '100%', height: '100%' }}
            onCreate={(m) => { mapRef.current = m; }}
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
              <CustomOverlayMap key={cat.id} position={pos} zIndex={2}>
                <svg
                  className={`pin ${selectedId === cat.id ? 'selected' : ''}`}
                  viewBox="0 0 96 96"
                  onClick={(e) => { e.stopPropagation(); setSelectedId(cat.id); }}
                >
                  <circle cx="48" cy="48" r="31" fill={PAW_PINK} fillOpacity="0.43" />
                  <circle cx="48" cy="48" r="31" fill="none" stroke={PAW_PINK} strokeOpacity="0.9" strokeWidth="1" />
                  <g fill={PAW_INK}>
                    <ellipse cx="36.4" cy="43.2" rx="5.9"  ry="6.9"  transform="rotate(-20 36.4 43.2)" />
                    <ellipse cx="44"   cy="38"   rx="5.9"  ry="7.3"  transform="rotate(-7 44 38)" />
                    <ellipse cx="52"   cy="38"   rx="5.9"  ry="7.3"  transform="rotate(7 52 38)" />
                    <ellipse cx="59.6" cy="43.2" rx="5.9"  ry="6.9"  transform="rotate(20 59.6 43.2)" />
                    <ellipse cx="48"   cy="52.8" rx="13.4" ry="10.4" />
                  </g>
                  <g fill={PAW_PINK}>
                    <ellipse cx="36.5" cy="43.6" rx="3.2" ry="3.9" transform="rotate(-20 36.5 43.6)" />
                    <ellipse cx="44.1" cy="38.6" rx="3.2" ry="4.2" transform="rotate(-7 44.1 38.6)" />
                    <ellipse cx="51.9" cy="38.6" rx="3.2" ry="4.2" transform="rotate(7 51.9 38.6)" />
                    <ellipse cx="59.5" cy="43.6" rx="3.2" ry="3.9" transform="rotate(20 59.5 43.6)" />
                    <path d="M48 46 Q56.6 48.4 57.6 52.1 Q58 56.2 48 58.8 Q38 56.2 38.4 52.1 Q39.4 48.4 48 46 Z" />
                  </g>
                </svg>
              </CustomOverlayMap>
            ))}

            {userPos && (
              <CustomOverlayMap position={userPos} zIndex={1}>
                <div className="me-dot" />
              </CustomOverlayMap>
            )}
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

      <button
        className={`fab-register ${selectedId != null ? 'is-hidden' : ''}`}
        onClick={onPlus}
        aria-label="냥이 등록하기"
      >
        <Plus size={26} strokeWidth={2.4} />
      </button>

      <CatFloatingCard cat={selected} onOpen={openDetail} />

      {/* ★ 등록 확인 단계 (§2.11) — + 를 누르면 폼 전에 이 한 단계 */}
      <RegisterConfirm
        open={confirmOpen}
        onGoCatalog={() => { setConfirmOpen(false); navigate('/nearby'); }}
        onGoForm={openRegister}
        onClose={() => setConfirmOpen(false)}
      />

      <CatRegisterForm
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        initialCenter={registerCenter}
        onCreated={handleCreated}
      />
    </>
  );
}
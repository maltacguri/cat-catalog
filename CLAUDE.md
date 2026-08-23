# 어디냐옹 — Claude Code 작업 규칙

캠퍼스 길고양이 도감. React(Vite) + Supabase + 카카오맵 + Vercel.
**현재 1인 개발** (홍대 동업자 이탈). 주 캠퍼스는 부산대.
**최종 갱신 2026-08-23 · 로드맵 35차(2026-08-22) 기준 · `main` raw 대조 완료**

---

## 0. 작업 전에 반드시 할 것

**어떤 작업이든 `docs/roadmap-v2.md`를 먼저 읽는다.** 특히:

- **§0** 문서 우선순위 · **§2** 확정(되묻지 않고 전제로) · **§3** 미확정(걸리면 **코딩 말고 질문**) · **§4** 지금 어디인지

| 파일 | 다루는 것 |
|---|---|
| `docs/roadmap-v2.md` | **유일한 기준.** 설계 결정 전부 |
| `docs/appflow.md` | 화면 흐름·전환·버튼 동작 |
| `docs/db-and-rls.md` | 스키마·RLS 스냅샷 ⚠️ **(6)차 이전이라 낡음. 믿지 말 것** |

**충돌하면 `roadmap-v2.md`가 이긴다.** 단, **DB 판단은 문서가 아니라 실물 SQL로 한다.**

---

## 1. 절대 하지 말 것

**문서를 마음대로 고치지 않는다.** 노션과 레포를 양쪽으로 관리하므로 Claude Code가 임의로 고치면 노션이 조용히 뒤처진다. 지시문에 문서 수정이 명시된 경우에만 고친다.

**미확정 사항을 코딩하지 않는다.** §3에 걸리면 멈추고 묻는다. **확정과 미확정을 한 문장에 섞지 않는다.** 애매하면 미확정이다.

**이지선다를 양쪽 다 만들지 않는다.** 사용자 선택을 기다린다.

**기능을 제안하지 않는다.** **스코프 방어가 우선이다.** "이것도 있으면 좋을 텐데"는 §3에 올리는 것이지 만드는 게 아니다.

**요청받지 않은 파일(`.md` 포함)을 만들지 않는다.**

---

## 2. 비협상 (코드로 어겨선 안 되는 것)

위반을 발견하면 **고치기 전에 보고**한다.

1. **EXIF(GPS 포함)는 무조건 제거한다.** `lib/image.js`의 캔버스 재인코딩 경로를 우회하는 업로드를 만들지 않는다
2. **목격 좌표는 저장 직전 50m 격자로 반올림한다.** `lib/geo.js`의 `snapToGrid`를 통과하지 않는 `sightings` INSERT는 없어야 한다
3. **목격 노출은 1시간 지연.** 프론트가 숨기는 게 아니라 DB 뷰(`cats_guest`/`cats_full`)가 안 준다. 지연을 우회하는 조회를 만들지 않는다
4. **실시간 위치·경로 안내·위치 기반 알림 금지.** "찾아가게" 말고 "우연히 만났을 때 알아보게"
5. **게스트에게 열리는 건 플로팅 카드 하나뿐.** 컬럼 차단은 DB 뷰가, 화면 차단은 UI가 한다

### DB 함정 (건드리기 전에 읽을 것)

- **뷰 수정은 `create or replace`로 컬럼을 뒤에만 붙인다.** `drop view`하면 **GRANT가 날아가고 게스트 방어선이 무너진다** (두 뷰는 `security_invoker`가 꺼져 있어 RLS가 아니라 GRANT가 방어선이다)
- **`sightings` SELECT는 1시간 지연 qual이 걸려 있다.** `addSighting` 뒤에 `.select()` read-back을 붙이면 **항상 0행**이다. INSERT 성공 여부만 본다
- **신규 테이블은 `anon`에 7개 GRANT가 전부 붙어 나온다.** 만들 때마다 회수하고 재확인한다
- **`sightings`/`feedings`/`bookmarks`는 `cats`에 CASCADE다.** `cats` DELETE는 복구 불가. 통상 처리는 `status='hidden'`
- **staff 계정으로 테스트하면 지연 관련 버그가 재현되지 않는다.** `select is_staff()`를 먼저 확인한다

---

## 3. 코드 작성 방식

- **부분 스니펫 말고 완전한 파일**로 준다. 주석은 인라인으로
- 기존 함수 시그니처를 그대로 쓴다. **중복 함수를 만들지 않는다**
- 디자인 토큰만 쓴다 — `src/styles/app.css`의 `--token-*`. 프로토타입 색(`#e51d53`)·폰트(`Gowun Batang`)를 새로 넣지 않는다
- 아이콘은 `lucide-react` outline 전용
- **설명은 최소로. 어디를 어떻게 고쳤는지만.** 부가 설명은 요청받을 때만
- 파일 여러 개를 건드리면 무엇을 왜 바꿨는지 마지막에 요약

### 디자인 토큰

```
paper #FBF7EF · sage #D7E0CC · deep green #3A5A40 · amber #C0842A · ink #2A2A24
마커 전용: 먹색 #343434 · 분홍 #F7ADAD
제목·고양이 이름 Gaegu / 본문 Gowun Dodum / 폴백 Noto Sans KR
z-index: 하단 바 45 · 상세/로그인 시트는 그 위 · RegisterConfirm 70
```

---

## 4. 파일 지도 (2026-08-23 `main` 실측)

```
src/
├─ App.jsx  main.jsx  index.css
├─ styles/app.css                    전 화면 스타일 + --token-*
├─ lib/
│  ├─ supabaseClient.js              supabase 인스턴스
│  ├─ format.js                      COPY 문구 · COLOR/KIND/SEX 라벨 매핑
│  ├─ geo.js                         snapToGrid (50m)
│  └─ image.js                       EXIF 제거 · orientation · HEIC · makeThumb
├─ config/policy.js
├─ api/
│  ├─ auth.js  profile.js  account.js
│  ├─ cats.js  sightings.js  feedings.js  bookmarks.js
│  ├─ photos.js  reports.js
├─ components/
│  ├─ AppUI.jsx (Context)  AppLayout.jsx  BottomBar.jsx
│  ├─ AuthPanel.jsx  PledgeOverlay.jsx  HomeGuideOverlay.jsx
│  ├─ CatFloatingCard.jsx  CatDetailPage.jsx  CatPhoto.jsx
│  ├─ CatRegisterForm.jsx  PhotoField.jsx  RegisterConfirm.jsx
│  └─ MeInfoOverlay.jsx  NoticePanel.jsx  ReportPanel.jsx
└─ pages/
   └─ MapPage.jsx  NearbyPage.jsx  MyCatPage.jsx  MePage.jsx
```

⚠️ **`CatDetailPage`는 `pages/`가 아니라 `components/`에 있다.** 라우트가 아니라 `AppLayout`이 든 단일 오버레이이기 때문이다.

---

## 5. 현재 위치 (2026-08-23)

Phase A·B·C·E·E-1·E-2·E-3 닫힘. **Phase D 1건, Phase F 전체가 남았다.**

**바로 다음 할 일 (로드맵 (35)차가 지정)**

1. **타계정 1시간 지연 검증** — 방금 남긴 목격 메모가 남에게 1시간 동안 안 보이는지. **깨지면 즉시 롤백.** 안전 판정의 핵심
2. `docs/roadmap-v2.md`를 노션 기준으로 동기화 (34·35차 반영) — 이 파일 갱신으로 처리 중

**남은 구현**

- Phase D — 사진 1장이면 자동 대표사진 지정 (로직 없음)
- Phase F — `storage.objects` UPDATE/DELETE 정책 · `anon`의 `cats` GRANT 정리 · `campus_id` CASCADE→SET NULL · 네이티브 `confirm()` 교체 · 전체 QA
- Phase G — PWA · 소프트런치

**열린 미확정 3개 — 걸리면 코딩 중단** (§3-8 role 모델 / §3-10 배포의 정의 / §3-20 가입 퀴즈)

### ⚠️ 문서에 기록 없이 구현돼 있는 것 (2026-08-23 raw 확인)

로드맵 §4·§5에 항목이 없다. **있다고 가정하고 다시 만들지 말 것.**

- **민원 창구 프론트** — `api/reports.js` · `ReportPanel.jsx` · `NoticePanel.jsx` · MePage 배선까지 완료. 로드맵 (31)차는 "프론트 미구현"으로 남아 있다
- **계정 관리** — `api/account.js`(`requestDeletion`·`fetchMyDeletionRequest`) · `MeInfoOverlay.jsx`
- **프로필 편집·로그아웃** — `api/profile.js`(`updateNickname`) · `signOut`. (26)차는 "범위 밖"으로 적어뒀다

### 알려진 부채

- `docs/db-and-rls.md`가 (6)차 이전 스냅샷이다. **스키마 판단은 실물 SQL로 한다**
- Phase B 더미 데이터가 남아 있다. 실제 수집 시작 전에 지운다
- 과급식 되묻기가 네이티브 `confirm()`이다 (토큰 미적용·모바일에서 도메인 노출)
- 부산대 실제 등록 3마리. 데이터 시딩 부족

---

## 6. 반복 금지 (실제로 겪은 것)

- **지시서를 쓰기 전에 SQL과 대상 파일 raw를 둘 다 뜬다.** 체크리스트를 믿고 쓰면 이미 된 일을 다시 시킨다 — **문서·코드 어긋남이 지금까지 8회 났고, 매번 방향이 달랐다**
- **어긋남은 양방향이다.** `[ ]`인데 구현돼 있던 경우가 더 많다
- **문서에 적혀 있어도 "그렇다"가 아니다.** §2에 "비협상"으로 적힌 1시간 지연이 실제 `cats_full`에는 없었다
- **검증 대상은 코드·DB·문서 셋이 아니라 넷이다.** 외부 콘솔(Supabase 대시보드·카카오·Resend) 설정이 어긋나면 코드와 문서가 서로 맞아도 동작이 다르다
- **데이터 이상을 보면 구조를 의심하기 전에 운영 이력을 먼저 묻는다.** `reporter_id` NULL 15행은 RLS 사고가 아니라 테스트 계정 삭제였다
- **낡은 문서로 감사하지 않는다.** 구버전 `roadmap-v2.md`로 판정한 "위반" 2건이 전부 오탐이었고, 따랐으면 확정 구조를 되돌릴 뻔했다
- **raw.githubusercontent는 파일별로 옛 버전을 캐시한다.** 커밋 해시 경로(`/{sha}/{path}`)로 받는다
- **차수를 인용할 때는 날짜를 같이 적는다.** 노션과 로컬이 서로 다른 "32차"를 달고 있던 적이 있다

---

## 7. 환경

- 레포 `github.com/maltacguri/cat-catalog` · 배포 `www.gilnyangee.com` (Vercel, `main` 자동)
- **`main`에 직접 push 금지 — 기능 브랜치 + PR**
- `.env`는 커밋하지 않는다. `VITE_SUPABASE_KEY` 사용
- Supabase 프로젝트 `ezujbxbrsbueidccixuu` · 메일은 Resend 커스텀 SMTP
- 카카오맵은 **web-DOM 전용** (React Native 불가). `vite.config.js`의 `strictPort: true` / 5173 고정은 SDK 도메인 등록 때문이다 — 바꾸지 않는다
- **카카오 도메인 등록 지점은 두 곳이다** — 플랫폼(Web) '사이트 도메인' + JS 키 안의 'SDK 도메인 설정'. 뒤쪽이 비면 401
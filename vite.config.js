import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * 한국어 웹폰트 @font-face 는 unicode-range 로 89조각씩 쪼개져 있어서, 그냥 두면
 * 렌더링 차단 CSS 가 gzip 88kB 까지 부푼다 (Google Fonts 로 같은 두 폰트를 받으면 25.6kB).
 * 이유가 둘이고 아래가 하나씩 잡는다.
 *
 *  1) fontsource 는 src 에 woff2 와 woff 를 둘 다 적는다. woff2 는 2015년부터 전 브라우저가
 *     지원하므로 woff 는 통째로 죽은 무게다 — URL 개수가 두 배가 되고 파일도 두 배로 나온다.
 *  2) Vite 가 폰트 파일명에 랜덤 해시를 붙이면 89개 URL 이 서로 안 닮아져서 gzip 이 안 먹는다
 *     (Google 은 4.4배로 줄고 해시본은 2.4배에 그친다). 폰트 파일은 패키지 버전으로 이미
 *     고정된 불변 자산이라 해시가 필요 없다.
 *
 * ⚠️ generateBundle 에서 한다. transform 훅은 안 된다 — @import 인라인은 vite:css 안에서
 *    일어나서, enforce:'pre' 로 잡으면 아직 @import 한 줄이고 'post' 로는 이미 늦다.
 */
const trimFontCss = {
  name: 'trim-font-css',
  apply: 'build',
  generateBundle(_options, bundle) {
    let cssTrimmed = 0
    let woffDropped = 0

    for (const [fileName, asset] of Object.entries(bundle)) {
      if (asset.type !== 'asset') continue

      if (fileName.endsWith('.css') && typeof asset.source === 'string') {
        const before = asset.source
        // `url(x.woff2) format('woff2'), url(x.woff) format('woff')` → 앞의 woff2 만 남긴다
        const after = before.replace(
          /,\s*url\(([^)]+)\.woff\)\s*format\(["']woff["']\)/g,
          ''
        )
        if (after !== before) { asset.source = after; cssTrimmed++ }
        continue
      }

      // 위에서 참조를 지웠으니 woff(1) 파일 자체도 내보내지 않는다. woff2 는 건드리지 않는다.
      if (/\.woff$/i.test(fileName)) { delete bundle[fileName]; woffDropped++ }
    }

    if (woffDropped) {
      this.info(`woff(1) ${woffDropped}개 제외 · CSS ${cssTrimmed}개에서 폴백 URL 제거`)
    }
  },
}

/**
 * PWA — 재방문 경로 확보용. 푸시는 아직 미확정이라 넣지 않았다 (로드맵 원칙 1 판정 대기).
 * 여기서 여는 건 "홈 화면 아이콘"까지다.
 *
 * ⚠️ 폰트는 precache 에서 제외한다. 위 trimFontCss 주석대로 한국어 서브셋이 89조각씩이라
 *    precache manifest 에 넣으면 SW 가 첫 방문에 그걸 전부 내려받는다. 실제로 쓰이는
 *    조각은 극히 일부다. 대신 runtime CacheFirst 로 "한 번 쓴 조각만" 남긴다.
 *
 * ⚠️ Supabase·카카오 응답은 어떤 형태로도 캐시하지 않는다. 목격 1시간 지연은 DB 뷰가
 *    거는 방어선인데, 응답을 SW 가 들고 있으면 캐시가 그 지연을 우회하게 된다.
 *    runtimeCaching 에 외부 오리진을 추가하려 할 때 이 줄을 먼저 읽을 것.
 */
const pwa = VitePWA({
  registerType: 'autoUpdate',   // 새 배포를 SW 가 알아서 교체한다. 갱신 안내 UI 는 없다
  injectRegister: 'auto',
  includeAssets: ['favicon-96x96.png'],
  // manifest 아이콘은 precache 에 넣지 않는다. 설치·스플래시 시점에만 쓰이는데
  // 그때는 어차피 온라인이다. 켜두면 512 PNG 두 장이 앱 셸보다 무거워진다.
  includeManifestIcons: false,
  manifest: {
    name: '어디냐옹',
    short_name: '어디냐옹',
    description: '캠퍼스 길고양이 도감',
    lang: 'ko',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FBF7EF',   // paper. index.html 의 theme-color 와 같은 값이어야 한다
    theme_color: '#FBF7EF',
    icons: [
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      // maskable 을 따로 안 뽑고 'any maskable' 로 겸한다. 원화가 이미 가장자리까지
      // 꽉 찬 구도라 런처가 잘라도 무너지지 않는다. 여백본을 만들면 오히려 고양이 몸이
      // 잘린 단면이 그대로 드러난다. 별도 파일로 뽑았더니 'any' 판본과 바이트까지
      // 같아서 (revision 해시 동일) 같은 그림을 두 번 싣는 꼴이었다.
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg}'],
    globIgnores: [
      '**/assets/fonts/**',       // 위 주석 참고
      // heic2any 는 gzip 345kB 짜리 지연 청크다. 아이폰 사용자가 HEIC 사진을 올릴 때만
      // 필요한데, precache 에 두면 첫 방문에서 전원이 이걸 받는다 (전체의 2/3).
      // 빼면 precache 가 2.0MB → 0.7MB 로 떨어진다. 필요할 때 평소처럼 네트워크로 받는다.
      '**/heic2any-*.js',
    ],
    navigateFallback: '/index.html',       // SPA — 어떤 경로로 들어와도 셸을 준다
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        // 자체 호스팅 폰트만. 파일명이 패키지 버전으로 고정된 불변 자산이라 CacheFirst 가 안전하다
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/fonts/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'fonts',
          expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
  devOptions: { enabled: false },   // dev 에서 SW 가 뜨면 HMR 과 캐시가 서로 꼬인다
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), trimFontCss, pwa],
  server: { port: 5173, strictPort: true },
  build: {
    // 폰트는 절대 base64 로 인라인하지 않는다. 한국어 서브셋은 조각당 3~4kB 라
    // 기본값(4096B)이면 상당수가 CSS 안으로 들어가는데, base64 는 엔트로피가 높아
    // gzip 이 안 먹는다 — 실측으로 URL 부분만 gzip 0.7kB → 46.8kB 로 불어났다.
    assetsInlineLimit(filePath) {
      if (/\.(woff2?|ttf|otf|eot)$/i.test(filePath)) return false
      return undefined   // 그 외 자산은 Vite 기본 규칙대로
    },
    rollupOptions: {
      output: {
        assetFileNames(info) {
          const name = info.names?.[0] ?? info.name ?? ''
          // 폰트는 원래 이름 그대로 — 위 2) 참고. 나머지 자산은 기존대로 해시를 붙인다.
          if (/\.(woff2?|ttf|otf|eot)$/i.test(name)) return 'assets/fonts/[name][extname]'
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})

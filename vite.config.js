import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), trimFontCss],
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

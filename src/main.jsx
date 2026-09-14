import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// ⚠️ 브랜드 폰트(@font-face)는 여기서 import 하지 않는다 — src/fonts.css 가 들고 있고
// index.html 이 별도 <link> 로 건다. 이유는 그 파일 맨 위 주석 참고 (번들 크기).

// 간격·이징 스케일. 색/폰트 토큰만 있고 크기 체계가 없어서 반경이 10종까지 늘어났었다.
// `:where(html)` 선택자라 특이도 0 — 기존 규칙을 덮지 않는다.
// app.css가 이 값들을 의미 있는 이름(--token-sp-*, --token-ease-*)으로 다시 묶는다.
import 'open-props/sizes.min.css'
import 'open-props/easings.min.css'

import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

# 學生作業指南

## 作業目標

製作一個可在桌面 Chrome 與 Meta Quest 3 執行的 360° Spatial Video Gallery。

## 必做修改

1. 準備 2–4 支 H.264／AAC MP4。
2. 修改 `src/config/demoConfig.ts` 的距離、寬度、亂數種子與空間音訊。
3. 修改介面主色與專案標題。
4. 在桌面確認每支 `VideoTexture` 持續更新。
5. 用手機 Safari 測試單指拖曳與陀螺儀。
6. 發布到自己的 Netlify。
7. 使用 Quest 3 實測依序出現、頭部轉向、HRTF 方位，以及 B／Y 重新開始。

## 驗收證據

- Netlify HTTPS 網址
- 桌面模式截圖
- Quest 3 實測照片或 20–30 秒錄影
- 一段 150 字以內的效能觀察
- GitHub Repository 網址

## 免費 ChatGPT 可用提示

```text
這是一個 Vite + TypeScript + Three.js WebXR 專案。
請只修改 src/config/demoConfig.ts 與 CSS，不要重寫核心架構。
先說明你準備修改的檔案，再提供最小差異，最後告訴我如何執行 npm run typecheck 與 npm run build:web。
```

## 不可做的事

- 不要把大型 MP4 提交進 GitHub。
- 不要把影片轉成 Base64。
- 不要移除「啟動影音體驗」按鈕來繞過瀏覽器授權。
- 不要用一般 HTML Video 音量取代 `THREE.PositionalAudio`。
- 不要宣稱滑鼠環視就是 WebXR。

# WebXR 360° Spatial Video Gallery

給大學數位多媒體設計課程使用的 Three.js／WebXR 教學 Demo。目前完成 Phase 1–5，並先加入一項 Quest 基本控制：

- 多支本機 MP4，各自建立 `HTMLVideoElement`、Blob URL 與 `VideoTexture`
- 影片依固定或可重現的隨機種子配置在 360° 方位
- 桌面拖曳環視與 Meta Quest 3 `immersive-vr`
- 每支影片各自建立 `MediaElementAudioSourceNode` 與 `THREE.PositionalAudio`
- HRTF 空間定位、距離衰減與完整資源釋放
- 依序模式：影片播完自動隱藏，等待後改在另一個隨機方位出現
- iPhone／iPad Safari 單指拖曳與 Device Orientation 陀螺儀預覽
- Quest Touch 右手 B／左手 Y 一鍵重新開始並重新抽選方位

## 學生最常修改的位置

基本作業只需修改：

```text
src/config/demoConfig.ts
```

可以調整影片距離、寬度、視線高度、隨機種子、循環播放與空間音訊參數。核心 Three.js、WebXR 與 Web Audio 程式不需要修改。

## 本機執行

需要 Node.js 22：

```bash
npm install
npm run dev
```

Chrome 開啟終端機顯示的網址，選擇 1–6 支 MP4，再按「啟動影音體驗」。建議使用 H.264／AAC、1080p 以下、30fps、單支 100MB 以下。

## 發布到 Netlify

### 方法 A：GitHub 自動部署

1. 將專案上傳到自己的 GitHub Repository。
2. 在 Netlify 選擇 **Add new project → Import an existing project**。
3. 選擇 GitHub Repository。
4. Netlify 會讀取 `netlify.toml`，自動使用：

```text
Build command: npm run build:web
Publish directory: dist/client
```

5. 部署完成後，在 Meta Quest 3 Browser 輸入 Netlify HTTPS 網址。

### 方法 B：教師建立一鍵部署按鈕

教師將本專案建立為 GitHub Template 後，可把以下 Repository 網址改為正式課程 Repository：

```markdown
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/aiclass00001-debug/webxr-360-spatial-video-gallery)
```

學生點擊按鈕、登入 GitHub 與 Netlify，即可建立自己的網站副本。

## Quest 3 測試

1. Netlify 網址必須是 HTTPS。
2. 使用 Quest Browser 開啟並加入書籤。
3. 上傳裝置內的 MP4。
4. 按「啟動影音體驗」取得影音授權。
5. 按「ENTER VR」進入 WebXR。
6. 戴耳機轉頭，確認聲音會從對應影片方向傳來。
7. 按右手 B（或左手 Y），確認影片從頭開始並換一組方位。

手機 Safari 不支援 `immersive-vr`，但可以使用單指拖曳，或按「啟用手機陀螺儀」並允許動作與方向感測器。

Air Link 只適合桌面串流與除錯，不是此專案的主要交付方式。

## Phase 狀態

| Phase | 狀態 |
|---|---|
| 1 單影片 VideoTexture MVP | 完成 |
| 2 多影片與 360° 配置 | 完成 |
| 3 Meta Quest 3 WebXR | 完成 |
| 4 獨立 HRTF 空間音訊 | 完成 |
| 5 依序與隨機出現 | 完成 |
| 6 注視與控制器互動 | 部分完成：B／Y 重新開始 |
| 7 IndexedDB 專案保存 | 尚未實作 |

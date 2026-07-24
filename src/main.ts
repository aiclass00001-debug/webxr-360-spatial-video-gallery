import "./style.css";
import "./look.css";
import "./phase2.css";
import "./phase4.css";
import "./phase5.css";
import { App, type PlaybackMode, type Status } from "./core/App";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<main class="shell">
  <header><div class="logo">360</div><div><small>DMD 教學模組 · PHASE 5</small><h1>WebXR 360° Spatial Video Gallery</h1></div><b>QUEST · SEQUENCE · HRTF</b></header>
  <section class="work phase2-work">
    <aside>
      <h2><i>01</i> 多影片素材</h2>
      <label class="drop"><input id="file" type="file" accept="video/mp4,.mp4" multiple><strong>＋</strong><span>選擇多支 MP4</span><small>最多 6 支 · 依序模式一次播放 1 支</small></label>
      <div id="video-list" class="video-list"><p class="empty-list">尚未載入影片</p></div>
      <button id="start" disabled>▶　啟動影音體驗</button>
      <button id="restart" class="secondary restart-button" disabled>↻　重新開始（Quest B／Y）</button>
      <button id="gyro" class="secondary gyro-button" hidden>◎　啟用手機陀螺儀</button>
      <div id="vr-slot"><span id="xr-state">正在檢查 WebXR…</span></div>

      <h2 class="settings-title"><i>02</i> 播放模式</h2>
      <div class="settings sequence-settings">
        <label>體驗模式<select id="playback-mode"><option value="sequence" selected>依序隨機出現</option><option value="all">全部同時顯示</option></select></label>
        <label>影片間隔 <output id="interval-out">2.0 s</output><input id="interval" type="range" min="0" max="10" step="0.5" value="2"></label>
        <label class="check"><input id="sequence-loop" type="checkbox" checked> 全部播完後自動循環</label>
        <p class="sequence-note">播完 → 隱藏 → 等待 → 下一支換新方位</p>
      </div>

      <h2 class="settings-title"><i>03</i> 360° 配置</h2>
      <div class="settings">
        <label>全部顯示配置<select id="mode"><option value="random" selected>隨機方位</option><option value="fixed">固定八方位</option></select></label>
        <label>影片寬度 <output id="width-out">2.8 m</output><input id="width" type="range" min="1.4" max="4.5" step="0.1" value="2.8"></label>
        <label>觀看距離 <output id="distance-out">3.5 m</output><input id="distance" type="range" min="2.5" max="7" step="0.1" value="3.5"></label>
        <label class="check"><input id="behind" type="checkbox" checked> 允許後方影片</label>
        <label>隨機種子<input id="seed" class="text-input" value="DMD-360-001"></label>
        <button id="randomize" class="secondary">重新隨機配置</button>
      </div>

      <h2 class="settings-title"><i>04</i> 空間音訊</h2>
      <div class="settings audio-settings">
        <label>音量 <output id="volume-out">80%</output><input id="volume" type="range" min="0" max="1" step="0.05" value="0.8"></label>
        <label>參考距離 <output id="ref-out">1.0 m</output><input id="ref-distance" type="range" min="0.5" max="5" step="0.1" value="1"></label>
        <label>最大距離 <output id="max-out">12 m</output><input id="max-distance" type="range" min="5" max="30" step="1" value="12"></label>
        <label>衰減強度 <output id="rolloff-out">1.0</output><input id="rolloff" type="range" min="0" max="4" step="0.1" value="1"></label>
        <p class="audio-note">HRTF · inverse distance · 每支影片獨立音源</p>
      </div>
    </aside>

    <article>
      <nav><span><i id="dot"></i>360° 預覽</span><span id="stats">0 FPS · 0/0 Playing · 0 Textures · 0 Audio</span></nav>
      <div id="viewport">
        <div class="look-hint">↔ 滑鼠／單指拖曳　◎ 手機可啟用陀螺儀</div>
        <div id="empty"><b>360°</b><strong>影片會在使用者周圍依序出現</strong><small>上傳 2–6 支 MP4，從空間音訊判斷影片方向</small></div>
        <div id="toast">等待上傳 MP4</div>
      </div>
      <footer>● Safari：單指拖曳／陀螺儀　 Quest：B／Y 重新開始　 Audio：HRTF</footer>
    </article>
  </section>
  <section class="scope"><b>Phase 5</b><span>依序播放 → 隨機方位 → 空間音訊引導 → 自動循環</span><em>下一階段：注視與控制器互動</em></section>
</main>`;

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const file = $("#file") as HTMLInputElement;
const start = $("#start") as HTMLButtonElement;
const restart = $("#restart") as HTMLButtonElement;
const gyro = $("#gyro") as HTMLButtonElement;
const list = $("#video-list");
const toast = $("#toast");
const stats = $("#stats");
const dot = $("#dot");
const xrState = $("#xr-state");
const empty = $("#empty");
const playbackMode = $("#playback-mode") as HTMLSelectElement;
const interval = $("#interval") as HTMLInputElement;
const sequenceLoop = $("#sequence-loop") as HTMLInputElement;
const mode = $("#mode") as HTMLSelectElement;
const width = $("#width") as HTMLInputElement;
const distance = $("#distance") as HTMLInputElement;
const behind = $("#behind") as HTMLInputElement;
const seed = $("#seed") as HTMLInputElement;
const volume = $("#volume") as HTMLInputElement;
const refDistance = $("#ref-distance") as HTMLInputElement;
const maxDistance = $("#max-distance") as HTMLInputElement;
const rolloff = $("#rolloff") as HTMLInputElement;

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
})[character]!);

const update = (status: Status) => {
  toast.textContent = status.message;
  toast.className = status.tone;
  dot.className = status.tone;
  stats.textContent = `${status.fps} FPS · ${status.playing}/${status.videos.length} Playing · ${status.textures} Textures · ${status.audioSources} Audio`;
  xrState.textContent = ({
    checking: "正在檢查 WebXR…",
    unsupported: "此瀏覽器不支援 immersive-vr；可使用觸控或陀螺儀預覽",
    ready: "WebXR 已就緒；啟動影音後顯示 VR 按鈕",
    active: "XR Session：運行中",
    ended: "XR Session：已結束",
  } as const)[status.xrState];
  start.disabled = status.videos.length === 0;
  restart.disabled = status.videos.length === 0;
  empty.hidden = status.videos.length > 0;
  gyro.hidden = status.gyroState === "unsupported";
  gyro.textContent = status.gyroState === "active" ? "◎　重新置中陀螺儀" : "◎　啟用手機陀螺儀";
  gyro.classList.toggle("active", status.gyroState === "active");
  playbackMode.value = status.playbackMode;
  list.innerHTML = status.videos.length
    ? status.videos.map((video, index) => `
      <div class="video-row${video.active ? " active" : ""}">
        <em>${index + 1}</em>
        <div><strong title="${escapeHtml(video.name)}">${escapeHtml(video.name)}</strong><small>${(video.size / 1048576).toFixed(1)} MB · ${video.resolution} · ${video.angle ?? "等待"}${video.angle === undefined ? "" : "°"}</small></div>
        <button data-remove="${index}" aria-label="移除 ${escapeHtml(video.name)}">×</button>
      </div>`).join("")
    : `<p class="empty-list">尚未載入影片</p>`;
};

const app = new App($("#viewport"), update);
file.onchange = () => {
  if (file.files) void app.load(file.files);
  file.value = "";
};
start.onclick = () => void app.activate();
restart.onclick = () => void app.restart();
gyro.onclick = () => void app.enableGyroscope();
list.onclick = (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-remove]");
  if (button) app.remove(Number(button.dataset.remove));
};

const applySettings = () => app.updateSettings({
  playbackMode: playbackMode.value as PlaybackMode,
  sequenceInterval: Number(interval.value),
  sequenceLoop: sequenceLoop.checked,
  mode: mode.value as "fixed" | "random",
  videoWidth: Number(width.value),
  distance: Number(distance.value),
  allowBehind: behind.checked,
  randomSeed: seed.value || "DMD-360-001",
  audio: {
    volume: Number(volume.value),
    refDistance: Number(refDistance.value),
    maxDistance: Number(maxDistance.value),
    rolloffFactor: Number(rolloff.value),
    distanceModel: "inverse",
  },
});

playbackMode.onchange = applySettings;
sequenceLoop.onchange = applySettings;
mode.onchange = applySettings;
behind.onchange = applySettings;
seed.onchange = applySettings;
interval.oninput = () => {
  $("#interval-out").textContent = `${Number(interval.value).toFixed(1)} s`;
  applySettings();
};
width.oninput = () => {
  $("#width-out").textContent = `${width.value} m`;
  applySettings();
};
distance.oninput = () => {
  $("#distance-out").textContent = `${distance.value} m`;
  applySettings();
};
volume.oninput = () => {
  $("#volume-out").textContent = `${Math.round(Number(volume.value) * 100)}%`;
  applySettings();
};
refDistance.oninput = () => {
  $("#ref-out").textContent = `${Number(refDistance.value).toFixed(1)} m`;
  applySettings();
};
maxDistance.oninput = () => {
  $("#max-out").textContent = `${maxDistance.value} m`;
  applySettings();
};
rolloff.oninput = () => {
  $("#rolloff-out").textContent = Number(rolloff.value).toFixed(1);
  applySettings();
};
$("#randomize").onclick = () => app.randomize();

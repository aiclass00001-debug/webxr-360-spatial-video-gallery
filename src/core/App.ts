import { SceneManager } from "./SceneManager";
import { VideoAsset } from "../video/VideoAsset";
import { VideoPlane } from "../video/VideoPlane";
import { VideoPlacementManager, type PlacementSettings } from "../video/VideoPlacementManager";
import { VideoSequenceManager } from "../video/VideoSequenceManager";
import { demoConfig } from "../config/demoConfig";
import { XRManager, type XRState } from "../xr/XRManager";
import { AudioManager, type SpatialAudioSettings } from "../audio/AudioManager";

export type PlaybackMode = "all" | "sequence";
export type GyroState = "unsupported" | "idle" | "active" | "denied";
export type VideoItem = {
  name: string;
  size: number;
  resolution: string;
  angle?: number;
  ended: boolean;
  active: boolean;
};
export type Settings = PlacementSettings & {
  videoWidth: number;
  playbackMode: PlaybackMode;
  sequenceInterval: number;
  sequenceLoop: boolean;
  audio: SpatialAudioSettings;
};
export type Status = {
  message: string;
  tone: "idle" | "ready" | "playing" | "error";
  videos: VideoItem[];
  fps: number;
  playing: number;
  textures: number;
  audioSources: number;
  audioState: AudioContextState | "locked";
  angles: Array<number | undefined>;
  xrState: XRState;
  gyroState: GyroState;
  playbackMode: PlaybackMode;
};

export class App {
  private readonly scene: SceneManager;
  private readonly xr: XRManager;
  private readonly audio: AudioManager;
  private readonly placement = new VideoPlacementManager();
  private readonly sequence: VideoSequenceManager;
  private xrState: XRState = "checking";
  private gyroState: GyroState;
  private assets: VideoAsset[] = [];
  private planes: VideoPlane[] = [];
  private angles: Array<number | undefined> = [];
  private statsStartedAt = performance.now();
  private frames = 0;
  private fps = 0;
  private message = "等待上傳 MP4";
  private tone: Status["tone"] = "idle";
  private activating = false;
  private experienceActive = false;
  private settings: Settings = {
    mode: "random",
    distance: demoConfig.videoDistance,
    eyeHeight: demoConfig.eyeHeight,
    allowBehind: true,
    randomSeed: demoConfig.randomSeed,
    videoWidth: demoConfig.videoWidth,
    playbackMode: demoConfig.playbackMode,
    sequenceInterval: demoConfig.sequenceInterval,
    sequenceLoop: demoConfig.sequenceLoop,
    audio: { ...demoConfig.spatialAudio },
  };

  constructor(host: HTMLElement, private report: (status: Status) => void) {
    this.scene = new SceneManager(host);
    this.gyroState = this.scene.orientation.supported ? "idle" : "unsupported";
    this.audio = new AudioManager(this.scene.camera, this.settings.audio);
    this.sequence = new VideoSequenceManager({
      show: (index, angle) => this.showSequenceVideo(index, angle),
      hide: (index) => this.hideVideo(index),
      change: (index, angle) => {
        this.angles = this.assets.map((_, itemIndex) => itemIndex === index ? angle : undefined);
        this.emit(`第 ${index + 1} 支影片出現在 ${angle}°；請依聲音方向轉頭`, "playing");
      },
      complete: () => {
        this.experienceActive = false;
        this.emit("依序播放已完成", "ready");
      },
      error: (index, error) => {
        this.emit(`${this.assets[index]?.file.name ?? "影片"} 播放失敗：${error instanceof Error ? error.message : "未知錯誤"}`, "error");
      },
    });
    this.xr = new XRManager(
      this.scene.renderer,
      this.scene.scene,
      (state) => {
        this.xrState = state;
        if (state === "active") this.emit("WebXR 已啟動：按 B／Y 可重新開始", "playing");
        else if (state === "ended") this.emit("已退出 VR，返回桌面預覽", "ready");
        else this.report(this.snapshot());
      },
      () => void this.restart(),
    );
    this.startLoop();
    addEventListener("resize", this.resize);
    addEventListener("beforeunload", this.dispose);
    this.emit();
  }

  private snapshot(): Status {
    const activeIndex = this.sequence.currentIndex;
    return {
      message: this.message,
      tone: this.tone,
      videos: this.assets.map((asset, index) => ({
        name: asset.file.name,
        size: asset.file.size,
        resolution: `${asset.video.videoWidth} × ${asset.video.videoHeight}`,
        angle: this.angles[index],
        ended: asset.video.ended,
        active: this.settings.playbackMode === "sequence"
          ? activeIndex === index
          : !asset.video.paused && !asset.video.ended,
      })),
      fps: this.fps,
      playing: this.assets.filter((asset) => !asset.video.paused && !asset.video.ended).length,
      textures: this.planes.length,
      audioSources: this.audio.sourceCount,
      audioState: this.audio.state,
      angles: this.angles,
      xrState: this.xrState,
      gyroState: this.gyroState,
      playbackMode: this.settings.playbackMode,
    };
  }

  private emit(message = this.message, tone = this.tone): void {
    this.message = message;
    this.tone = tone;
    this.report(this.snapshot());
  }

  private startLoop(): void {
    this.scene.renderer.setAnimationLoop(() => {
      this.scene.update();
      this.xr.update();
      this.scene.renderer.render(this.scene.scene, this.scene.camera);
      this.frames += 1;
      const now = performance.now();
      const elapsed = now - this.statsStartedAt;
      if (elapsed >= 1000) {
        this.fps = Math.round(this.frames * 1000 / elapsed);
        this.frames = 0;
        this.statsStartedAt = now;
        this.report(this.snapshot());
      }
    });
  }

  async load(files: FileList | File[]): Promise<void> {
    const incoming = Array.from(files).slice(0, 6 - this.assets.length);
    if (!incoming.length) {
      this.emit("最多載入 6 支影片", "error");
      return;
    }

    for (const file of incoming) {
      if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) {
        this.emit(`${file.name} 不是 MP4，已略過`, "error");
        continue;
      }
      const asset = new VideoAsset(file);
      try {
        await asset.load();
        const plane = new VideoPlane(asset);
        plane.setWidth(this.settings.videoWidth);
        asset.video.addEventListener("ended", () => this.onAssetEnded(asset));
        this.assets.push(asset);
        this.planes.push(plane);
        this.scene.scene.add(plane.mesh);
      } catch {
        asset.dispose();
        this.emit(`${file.name} 無法解碼`, "error");
      }
    }

    this.relayout();
    this.hideAll();
    this.emit(`已載入 ${this.assets.length} 支影片；目前為${this.settings.playbackMode === "sequence" ? "依序隨機" : "全部顯示"}模式`, "ready");
  }

  async activate(): Promise<void> {
    if (!this.assets.length) {
      this.emit("請先上傳 MP4", "error");
      return;
    }
    if (this.activating) return;
    this.activating = true;
    try {
      await this.audio.activate();
      for (let index = 0; index < this.assets.length; index += 1) {
        const asset = this.assets[index];
        const positionalAudio = this.audio.connect(asset.video, this.planes[index].mesh);
        // Safari 的播放授權以 VideoElement 為單位；使用者按鈕事件中逐一解鎖。
        positionalAudio.setVolume(0);
        await asset.play();
        asset.pause();
        asset.video.currentTime = 0;
      }
      this.audio.updateSettings(this.settings.audio);
      this.experienceActive = true;
      await this.startCurrentMode();
      this.xr.unlock();
    } catch (error) {
      this.experienceActive = false;
      this.emit(`影音啟動失敗：${error instanceof Error ? error.message : "未知錯誤"}`, "error");
    } finally {
      this.activating = false;
    }
  }

  async enableGyroscope(): Promise<void> {
    if (this.gyroState === "active") {
      this.scene.recenterGyroscope();
      this.emit("手機陀螺儀已重新置中", "ready");
      return;
    }
    try {
      const enabled = await this.scene.enableGyroscope();
      this.gyroState = enabled ? "active" : "denied";
      this.emit(enabled ? "手機陀螺儀已啟用；轉動手機即可環視" : "裝置不支援或未允許動作感測器", enabled ? "ready" : "error");
    } catch {
      this.gyroState = "denied";
      this.emit("Safari 未允許動作與方向感測器", "error");
    }
  }

  async restart(): Promise<void> {
    if (!this.assets.length) {
      this.emit("請先上傳 MP4", "error");
      return;
    }
    if (!this.experienceActive) {
      await this.activate();
      return;
    }
    this.settings.randomSeed = `${Date.now()}`;
    this.assets.forEach((asset) => {
      asset.pause();
      asset.video.currentTime = 0;
    });
    this.experienceActive = true;
    try {
      await this.startCurrentMode();
      this.emit("已重新開始：影片歸零並重新抽選方位", "playing");
    } catch (error) {
      this.emit(`重新開始失敗：${error instanceof Error ? error.message : "未知錯誤"}`, "error");
    }
  }

  updateSettings(next: Partial<Settings>): void {
    const previous = this.settings;
    const restartSequence = this.experienceActive && (
      previous.playbackMode !== (next.playbackMode ?? previous.playbackMode)
      || previous.sequenceInterval !== (next.sequenceInterval ?? previous.sequenceInterval)
      || previous.sequenceLoop !== (next.sequenceLoop ?? previous.sequenceLoop)
      || previous.allowBehind !== (next.allowBehind ?? previous.allowBehind)
      || previous.randomSeed !== (next.randomSeed ?? previous.randomSeed)
    );
    this.settings = { ...this.settings, ...next, audio: { ...this.settings.audio, ...next.audio } };
    this.audio.updateSettings(this.settings.audio);
    this.planes.forEach((plane) => plane.setWidth(this.settings.videoWidth));

    if (restartSequence) {
      void this.startCurrentMode();
    } else if (this.experienceActive && this.settings.playbackMode === "sequence") {
      const currentIndex = this.sequence.currentIndex;
      const angle = currentIndex === undefined ? undefined : this.angles[currentIndex];
      if (currentIndex !== undefined && angle !== undefined) {
        this.placement.placeOne(this.planes[currentIndex], angle, this.settings);
      }
    } else {
      this.relayout();
    }
    this.emit("場景、播放與空間音訊設定已更新", "ready");
  }

  randomize(): void {
    this.settings.randomSeed = `${Date.now()}`;
    if (this.experienceActive) void this.startCurrentMode();
    else this.relayout();
    this.emit("已產生新亂數種子並重新配置", "ready");
  }

  remove(index: number): void {
    const asset = this.assets[index];
    const plane = this.planes[index];
    if (!asset || !plane) return;
    const restart = this.experienceActive;
    this.sequence.stop();
    this.audio.disconnect(asset.video);
    plane.dispose();
    asset.dispose();
    this.assets.splice(index, 1);
    this.planes.splice(index, 1);
    this.relayout();
    if (restart && this.assets.length) void this.startCurrentMode();
    else if (!this.assets.length) this.experienceActive = false;
    this.emit("影片、VideoTexture 與空間音訊節點已釋放", "ready");
  }

  private async startCurrentMode(): Promise<void> {
    this.sequence.stop();
    this.assets.forEach((asset) => asset.pause());
    this.hideAll();

    if (this.settings.playbackMode === "sequence") {
      this.sequence.start(
        this.assets.map((asset) => asset.video),
        {
          intervalSeconds: this.settings.sequenceInterval,
          loop: this.settings.sequenceLoop,
          randomSeed: this.settings.randomSeed,
          angles: this.placement.availableAngles(this.settings),
        },
      );
      return;
    }

    this.relayout();
    let played = 0;
    for (let index = 0; index < this.assets.length; index += 1) {
      const asset = this.assets[index];
      const plane = this.planes[index];
      if (index >= 4) {
        asset.pause();
        plane.mesh.visible = false;
        continue;
      }
      if (asset.video.ended) asset.video.currentTime = 0;
      plane.mesh.visible = true;
      await asset.play();
      played += 1;
    }
    this.emit(`全部顯示模式：${played} 支播放 · ${this.audio.sourceCount} 組 HRTF 音源`, "playing");
  }

  private async showSequenceVideo(index: number, angle: number): Promise<void> {
    const asset = this.assets[index];
    const plane = this.planes[index];
    if (!asset || !plane) throw new Error("影片已不存在");
    this.hideAll();
    this.placement.placeOne(plane, angle, this.settings);
    asset.video.currentTime = 0;
    plane.mesh.visible = true;
    await asset.play();
  }

  private hideVideo(index: number): void {
    this.assets[index]?.pause();
    if (this.planes[index]) this.planes[index].mesh.visible = false;
  }

  private hideAll(): void {
    this.planes.forEach((plane) => plane.mesh.visible = false);
  }

  private onAssetEnded(asset: VideoAsset): void {
    if (this.settings.playbackMode === "sequence") return;
    const index = this.assets.indexOf(asset);
    this.hideVideo(index);
    this.emit(`${asset.file.name} 播放完成，平面已隱藏`, "ready");
  }

  private relayout(): void {
    if (this.settings.playbackMode === "sequence" && this.experienceActive) return;
    this.angles = this.placement.place(this.planes, this.settings);
  }

  private resize = () => this.scene.resize();

  dispose = () => {
    this.scene.renderer.setAnimationLoop(null);
    this.sequence.stop();
    void this.xr.endSession();
    this.xr.dispose();
    this.assets.forEach((asset) => asset.pause());
    void this.audio.suspend();
    this.audio.dispose();
    this.planes.forEach((plane) => plane.dispose());
    this.assets.forEach((asset) => asset.dispose());
    removeEventListener("resize", this.resize);
    removeEventListener("beforeunload", this.dispose);
    this.scene.dispose();
  };
}

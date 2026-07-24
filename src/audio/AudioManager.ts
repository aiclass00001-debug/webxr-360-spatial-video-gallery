import * as THREE from "three";

export type SpatialAudioSettings = {
  volume: number;
  refDistance: number;
  rolloffFactor: number;
  maxDistance: number;
  distanceModel: DistanceModelType;
};

type AudioBinding = {
  audio: THREE.PositionalAudio;
  source: MediaElementAudioSourceNode;
};

/**
 * 集中管理 Web Audio 與 Three.js 空間音訊生命週期。
 *
 * AudioManager 只在「啟動影音體驗」的使用者手勢後建立 AudioContext。
 * Map 確保每個 HTMLVideoElement 一生只會建立一次 MediaElementSource。
 */
export class AudioManager {
  private listener?: THREE.AudioListener;
  private readonly bindings = new Map<HTMLVideoElement, AudioBinding>();

  constructor(
    private readonly camera: THREE.Camera,
    private settings: SpatialAudioSettings,
  ) {}

  async activate(): Promise<void> {
    if (!this.listener) {
      this.listener = new THREE.AudioListener();
      this.camera.add(this.listener);
    }

    if (this.listener.context.state !== "running") {
      await this.listener.context.resume();
    }
  }

  connect(video: HTMLVideoElement, parent: THREE.Object3D): THREE.PositionalAudio {
    const existing = this.bindings.get(video);
    if (existing) {
      if (existing.audio.parent !== parent) parent.add(existing.audio);
      this.apply(existing.audio);
      return existing.audio;
    }

    if (!this.listener) {
      throw new Error("AudioContext 尚未由使用者手勢啟動");
    }

    const audio = new THREE.PositionalAudio(this.listener);
    audio.setMediaElementSource(video);
    this.apply(audio);
    parent.add(audio);

    const source = audio.source as MediaElementAudioSourceNode | null;
    if (!source) {
      audio.disconnect();
      audio.removeFromParent();
      throw new Error("無法建立 MediaElementAudioSourceNode");
    }

    this.bindings.set(video, { audio, source });
    return audio;
  }

  updateSettings(next: Partial<SpatialAudioSettings>): void {
    this.settings = { ...this.settings, ...next };
    this.bindings.forEach(({ audio }) => this.apply(audio));
  }

  get sourceCount(): number {
    return this.bindings.size;
  }

  get state(): AudioContextState | "locked" {
    return this.listener?.context.state ?? "locked";
  }

  disconnect(video: HTMLVideoElement): void {
    const binding = this.bindings.get(video);
    if (!binding) return;

    binding.audio.disconnect();
    binding.audio.gain.disconnect();
    binding.audio.removeFromParent();
    this.bindings.delete(video);
  }

  async suspend(): Promise<void> {
    if (this.listener?.context.state === "running") {
      await this.listener.context.suspend();
    }
  }

  dispose(): void {
    [...this.bindings.keys()].forEach((video) => this.disconnect(video));
    if (this.listener) {
      this.listener.gain.disconnect();
      this.listener.removeFromParent();
      this.listener = undefined;
    }
  }

  private apply(audio: THREE.PositionalAudio): void {
    audio.setVolume(this.settings.volume);
    audio.setRefDistance(this.settings.refDistance);
    audio.setRolloffFactor(this.settings.rolloffFactor);
    audio.setMaxDistance(this.settings.maxDistance);
    audio.setDistanceModel(this.settings.distanceModel);
    audio.panner.panningModel = "HRTF";
  }
}

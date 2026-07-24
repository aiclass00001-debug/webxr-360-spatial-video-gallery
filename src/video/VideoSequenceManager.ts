import { seededRandom } from "./VideoPlacementManager";

export type SequenceSettings = {
  intervalSeconds: number;
  loop: boolean;
  randomSeed: string;
  angles: number[];
};

export type SequenceCallbacks = {
  show: (index: number, angle: number) => Promise<void>;
  hide: (index: number) => void;
  change: (index: number, angle: number) => void;
  complete: () => void;
  error: (index: number, error: unknown) => void;
};

type ActiveVideo = {
  index: number;
  video: HTMLVideoElement;
  ended: () => void;
};

/** Mode B：一次只顯示一支，播完後等待，再切換影片與方位。 */
export class VideoSequenceManager {
  private timer?: number;
  private active?: ActiveVideo;
  private generation = 0;
  private videoOrder: number[] = [];
  private angleOrder: number[] = [];
  private videoCursor = 0;
  private angleCursor = 0;
  private round = 0;
  private lastAngle?: number;
  private videos: HTMLVideoElement[] = [];
  private settings?: SequenceSettings;

  constructor(private readonly callbacks: SequenceCallbacks) {}

  start(videos: HTMLVideoElement[], settings: SequenceSettings): void {
    this.stop();
    this.videos = videos;
    this.settings = settings;
    this.round = 0;
    this.videoCursor = 0;
    this.angleCursor = 0;
    this.videoOrder = this.makeOrder(videos.length, "videos");
    this.angleOrder = this.makeAngleOrder();
    const generation = this.generation;
    void this.next(generation);
  }

  stop(): void {
    this.generation += 1;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    if (this.active) {
      this.active.video.removeEventListener("ended", this.active.ended);
      this.callbacks.hide(this.active.index);
      this.active = undefined;
    }
  }

  get currentIndex(): number | undefined {
    return this.active?.index;
  }

  private async next(generation: number): Promise<void> {
    if (generation !== this.generation || !this.settings || !this.videos.length) return;

    if (this.videoCursor >= this.videoOrder.length) {
      if (!this.settings.loop) {
        this.callbacks.complete();
        return;
      }
      this.round += 1;
      this.videoCursor = 0;
      this.videoOrder = this.makeOrder(this.videos.length, `videos-${this.round}`);
    }
    if (this.angleCursor >= this.angleOrder.length) {
      this.angleCursor = 0;
      this.angleOrder = this.makeAngleOrder();
    }

    const index = this.videoOrder[this.videoCursor++];
    const angle = this.angleOrder[this.angleCursor++];
    this.lastAngle = angle;
    const video = this.videos[index];
    const ended = () => this.finish(index, generation);
    this.active = { index, video, ended };
    video.addEventListener("ended", ended, { once: true });
    this.callbacks.change(index, angle);

    try {
      await this.callbacks.show(index, angle);
    } catch (error) {
      this.callbacks.error(index, error);
      this.finish(index, generation);
    }
  }

  private finish(index: number, generation: number): void {
    if (generation !== this.generation || this.active?.index !== index || !this.settings) return;
    this.active.video.removeEventListener("ended", this.active.ended);
    this.callbacks.hide(index);
    this.active = undefined;
    this.timer = window.setTimeout(
      () => void this.next(generation),
      Math.max(0, this.settings!.intervalSeconds) * 1000,
    );
  }

  private makeOrder(length: number, salt: string): number[] {
    const values = Array.from({ length }, (_, index) => index);
    return this.shuffle(values, seededRandom(`${this.settings?.randomSeed ?? ""}:${salt}`));
  }

  private makeAngleOrder(): number[] {
    if (!this.settings?.angles.length) return [0];
    const values = this.shuffle(
      [...this.settings.angles],
      seededRandom(`${this.settings.randomSeed}:angles-${this.round}-${this.angleCursor}`),
    );
    if (values.length > 1 && values[0] === this.lastAngle) {
      [values[0], values[1]] = [values[1], values[0]];
    }
    return values;
  }

  private shuffle<T>(values: T[], random: () => number): T[] {
    for (let index = values.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [values[index], values[other]] = [values[other], values[index]];
    }
    return values;
  }
}

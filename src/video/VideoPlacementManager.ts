import type { VideoPlane } from "./VideoPlane";

export type PlacementSettings = {
  mode: "fixed" | "random";
  distance: number;
  eyeHeight: number;
  allowBehind: boolean;
  randomSeed: string;
};

export const ALL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

export function seededRandom(seed: string): () => number {
  let value = 2166136261;
  for (const char of seed) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

export class VideoPlacementManager {
  availableAngles(settings: Pick<PlacementSettings, "allowBehind">): number[] {
    return settings.allowBehind
      ? [...ALL_ANGLES]
      : ALL_ANGLES.filter((angle) => angle < 135 || angle > 225);
  }

  place(planes: VideoPlane[], settings: PlacementSettings): number[] {
    const available = this.availableAngles(settings);
    const angles = settings.mode === "random"
      ? this.shuffle(available, seededRandom(settings.randomSeed))
      : available;

    planes.forEach((plane, index) => {
      const angle = angles[index];
      if (angle === undefined) {
        plane.mesh.visible = false;
        return;
      }
      this.placeOne(plane, angle, settings);
      plane.mesh.visible = !plane.asset.video.ended;
    });
    return angles.slice(0, planes.length);
  }

  placeOne(plane: VideoPlane, angle: number, settings: PlacementSettings): void {
    const radians = angle * Math.PI / 180;
    plane.mesh.position.set(
      Math.sin(radians) * settings.distance,
      settings.eyeHeight,
      -Math.cos(radians) * settings.distance,
    );
    plane.mesh.lookAt(0, settings.eyeHeight, 0);
  }

  shuffle(values: number[], random: () => number): number[] {
    for (let index = values.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [values[index], values[other]] = [values[other], values[index]];
    }
    return values;
  }
}

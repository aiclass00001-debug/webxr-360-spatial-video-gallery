import * as THREE from "three";
import { demoConfig } from "../config/demoConfig";
import type { VideoAsset } from "./VideoAsset";

export class VideoPlane {
  readonly texture: THREE.VideoTexture;
  readonly material: THREE.MeshBasicMaterial;
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

  constructor(readonly asset: VideoAsset) {
    const aspect = asset.video.videoWidth / asset.video.videoHeight;
    this.texture = new THREE.VideoTexture(asset.video);
    Object.assign(this.texture, {
      colorSpace: THREE.SRGBColorSpace,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
    });
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      toneMapped: false,
      side: THREE.DoubleSide,
      transparent: false,
    });
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(demoConfig.videoWidth, demoConfig.videoWidth / aspect),
      this.material,
    );
    this.mesh.position.set(0, demoConfig.eyeHeight, -demoConfig.videoDistance);
  }

  setWidth(width: number): void {
    const aspect = this.asset.video.videoWidth / this.asset.video.videoHeight;
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.PlaneGeometry(width, width / aspect);
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}

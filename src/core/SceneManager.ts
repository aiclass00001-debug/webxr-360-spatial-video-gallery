import * as THREE from "three";
import { demoConfig } from "../config/demoConfig";
import { DesktopLookControls } from "./DesktopLookControls";
import { MobileOrientationControls } from "./MobileOrientationControls";

export class SceneManager {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: DesktopLookControls;
  readonly orientation: MobileOrientationControls;

  constructor(readonly host: HTMLElement) {
    this.scene.background = new THREE.Color(0);
    this.camera.position.set(0, demoConfig.eyeHeight, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    host.append(this.renderer.domElement);
    this.controls = new DesktopLookControls(this.camera, this.renderer.domElement);
    this.orientation = new MobileOrientationControls(this.camera);
    this.resize();
  }

  async enableGyroscope(): Promise<boolean> {
    const enabled = await this.orientation.enable();
    if (enabled) this.controls.setEnabled(false);
    return enabled;
  }

  recenterGyroscope(): void {
    this.orientation.recenter();
  }

  update(): void {
    if (!this.renderer.xr.isPresenting) this.orientation.update();
  }

  resize(): void {
    const width = Math.max(this.host.clientWidth, 1);
    const height = Math.max(this.host.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  dispose(): void {
    this.controls.dispose();
    this.orientation.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

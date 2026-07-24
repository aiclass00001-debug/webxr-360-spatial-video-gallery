import * as THREE from "three";

type PermissionAwareDeviceOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

const zee = new THREE.Vector3(0, 0, 1);
const euler = new THREE.Euler();
const screenQuaternion = new THREE.Quaternion();
const cameraCorrection = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

/** 手機非 VR 預覽：支援 iOS Safari 權限流程與螢幕旋轉方向。 */
export class MobileOrientationControls {
  private orientation?: DeviceOrientationEvent;
  private enabled = false;
  private alphaOffset = 0;
  private needsRecenter = true;

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  get supported(): boolean {
    return typeof window !== "undefined" && "DeviceOrientationEvent" in window;
  }

  get active(): boolean {
    return this.enabled;
  }

  async enable(): Promise<boolean> {
    if (!this.supported) return false;
    const eventType = DeviceOrientationEvent as PermissionAwareDeviceOrientationEvent;
    if (eventType.requestPermission) {
      const permission = await eventType.requestPermission();
      if (permission !== "granted") return false;
    }
    if (!this.enabled) {
      addEventListener("deviceorientation", this.onOrientation);
      this.enabled = true;
      this.needsRecenter = true;
    }
    return true;
  }

  recenter(): void {
    this.needsRecenter = true;
  }

  update(): void {
    if (!this.enabled || this.orientation?.alpha == null) return;
    const alpha = THREE.MathUtils.degToRad(this.orientation.alpha) + this.alphaOffset;
    const beta = THREE.MathUtils.degToRad(this.orientation.beta ?? 0);
    const gamma = THREE.MathUtils.degToRad(this.orientation.gamma ?? 0);
    const legacyOrientation = (window as Window & { orientation?: number }).orientation;
    const screenAngle = screen.orientation?.angle ?? legacyOrientation ?? 0;
    const orient = THREE.MathUtils.degToRad(screenAngle);

    euler.set(beta, alpha, -gamma, "YXZ");
    this.camera.quaternion.setFromEuler(euler);
    this.camera.quaternion.multiply(cameraCorrection);
    this.camera.quaternion.multiply(screenQuaternion.setFromAxisAngle(zee, -orient));
  }

  dispose(): void {
    removeEventListener("deviceorientation", this.onOrientation);
    this.enabled = false;
    this.orientation = undefined;
  }

  private onOrientation = (event: DeviceOrientationEvent) => {
    this.orientation = event;
    if (this.needsRecenter && event.alpha != null) {
      this.alphaOffset = -THREE.MathUtils.degToRad(event.alpha);
      this.needsRecenter = false;
    }
  };
}

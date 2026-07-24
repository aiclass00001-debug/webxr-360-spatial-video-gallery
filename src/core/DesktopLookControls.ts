import * as THREE from "three";

/**
 * 非 VR 預覽環視控制。
 * Pointer Events 處理滑鼠／觸控筆；Touch Events 專門作為 iOS Safari 備援。
 */
export class DesktopLookControls {
  private yaw = 0;
  private pitch = 0;
  private pointerId: number | null = null;
  private touchId: number | null = null;
  private previousX = 0;
  private previousY = 0;
  private enabled = true;

  constructor(private camera: THREE.PerspectiveCamera, private element: HTMLElement) {
    camera.rotation.order = "YXZ";
    element.style.cursor = "grab";
    element.style.touchAction = "none";
    element.addEventListener("pointerdown", this.onPointerDown);
    element.addEventListener("pointermove", this.onPointerMove, { passive: false });
    element.addEventListener("pointerup", this.onPointerUp);
    element.addEventListener("pointercancel", this.onPointerUp);
    element.addEventListener("lostpointercapture", this.onLostPointerCapture);
    element.addEventListener("touchstart", this.onTouchStart, { passive: false });
    element.addEventListener("touchmove", this.onTouchMove, { passive: false });
    element.addEventListener("touchend", this.onTouchEnd, { passive: false });
    element.addEventListener("touchcancel", this.onTouchEnd, { passive: false });
    element.addEventListener("wheel", this.onWheel, { passive: false });
    element.addEventListener("contextmenu", this.onContextMenu);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.pointerId = null;
    this.touchId = null;
    this.element.style.cursor = enabled ? "grab" : "default";
  }

  private onPointerDown = (event: PointerEvent) => {
    // 觸控交由 Touch Events 處理，避開 iOS Safari pointer capture 問題。
    if (!this.enabled || event.pointerType === "touch" || event.button !== 0 || this.pointerId !== null) return;
    this.pointerId = event.pointerId;
    this.previousX = event.clientX;
    this.previousY = event.clientY;
    try {
      this.element.setPointerCapture(event.pointerId);
    } catch {
      // Safari 某些版本會拒絕 pointer capture；仍可使用一般 pointermove。
    }
    this.element.style.cursor = "grabbing";
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.enabled || event.pointerType === "touch" || event.pointerId !== this.pointerId) return;
    event.preventDefault();
    this.rotate(event.clientX, event.clientY);
  };

  private onPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.element.style.cursor = "grab";
  };

  private onLostPointerCapture = () => {
    this.pointerId = null;
    if (this.enabled) this.element.style.cursor = "grab";
  };

  private onTouchStart = (event: TouchEvent) => {
    if (!this.enabled || this.touchId !== null || event.touches.length !== 1) return;
    event.preventDefault();
    const touch = event.changedTouches[0];
    this.touchId = touch.identifier;
    this.previousX = touch.clientX;
    this.previousY = touch.clientY;
  };

  private onTouchMove = (event: TouchEvent) => {
    if (!this.enabled || this.touchId === null) return;
    const touch = Array.from(event.changedTouches).find((item) => item.identifier === this.touchId);
    if (!touch) return;
    event.preventDefault();
    this.rotate(touch.clientX, touch.clientY);
  };

  private onTouchEnd = (event: TouchEvent) => {
    if (this.touchId === null) return;
    if (Array.from(event.changedTouches).some((touch) => touch.identifier === this.touchId)) {
      event.preventDefault();
      this.touchId = null;
    }
  };

  private rotate(clientX: number, clientY: number): void {
    this.yaw -= (clientX - this.previousX) * 0.004;
    this.pitch -= (clientY - this.previousY) * 0.004;
    this.previousX = clientX;
    this.previousY = clientY;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI * 0.47, Math.PI * 0.47);
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }

  private onWheel = (event: WheelEvent) => {
    if (!this.enabled) return;
    event.preventDefault();
    this.camera.fov = THREE.MathUtils.clamp(this.camera.fov + event.deltaY * 0.025, 45, 90);
    this.camera.updateProjectionMatrix();
  };

  private onContextMenu = (event: MouseEvent) => event.preventDefault();

  dispose(): void {
    this.element.removeEventListener("pointerdown", this.onPointerDown);
    this.element.removeEventListener("pointermove", this.onPointerMove);
    this.element.removeEventListener("pointerup", this.onPointerUp);
    this.element.removeEventListener("pointercancel", this.onPointerUp);
    this.element.removeEventListener("lostpointercapture", this.onLostPointerCapture);
    this.element.removeEventListener("touchstart", this.onTouchStart);
    this.element.removeEventListener("touchmove", this.onTouchMove);
    this.element.removeEventListener("touchend", this.onTouchEnd);
    this.element.removeEventListener("touchcancel", this.onTouchEnd);
    this.element.removeEventListener("wheel", this.onWheel);
    this.element.removeEventListener("contextmenu", this.onContextMenu);
  }
}

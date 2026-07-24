import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

export type XRState = "checking" | "unsupported" | "ready" | "active" | "ended";

export class XRManager {
  private readonly button: HTMLElement;
  private readonly controllers: THREE.Group[] = [];
  private readonly inputSources: Array<XRInputSource | undefined> = [];
  private readonly restartPressed = [false, false];
  private session?: XRSession;

  constructor(
    private renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    private onState: (state: XRState) => void,
    private onRestart: () => void,
  ) {
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    this.button = VRButton.createButton(renderer, { optionalFeatures: ["local-floor", "bounded-floor"] });
    this.button.id = "VRButton";
    this.button.classList.add("phase3-vr-button");
    this.button.style.display = "none";
    document.querySelector("#vr-slot")?.append(this.button);
    for (let index = 0; index < 2; index += 1) {
      const controller = renderer.xr.getController(index);
      controller.name = index === 0 ? "Quest Left Controller" : "Quest Right Controller";
      controller.visible = false;
      controller.addEventListener("connected", (event) => {
        controller.visible = true;
        this.inputSources[index] = event.data;
      });
      controller.addEventListener("disconnected", () => {
        controller.visible = false;
        this.inputSources[index] = undefined;
        this.restartPressed[index] = false;
      });
      scene.add(controller);
      this.controllers.push(controller);
    }
    renderer.xr.addEventListener("sessionstart", this.onSessionStart);
    renderer.xr.addEventListener("sessionend", this.onSessionEnd);
    void this.checkSupport();
  }

  private async checkSupport(): Promise<void> {
    if (!navigator.xr) return this.onState("unsupported");
    this.onState(await navigator.xr.isSessionSupported("immersive-vr") ? "ready" : "unsupported");
  }

  unlock(): void { this.button.style.display = "block"; }
  update(): void {
    if (!this.renderer.xr.isPresenting) return;
    this.inputSources.forEach((inputSource, index) => {
      // WebXR xr-standard mapping：button[5] 是 Quest Touch 的 B／Y。
      const pressed = inputSource?.gamepad?.buttons[5]?.pressed ?? false;
      if (pressed && !this.restartPressed[index]) this.onRestart();
      this.restartPressed[index] = pressed;
    });
  }
  private onSessionStart = () => { this.session = this.renderer.xr.getSession() ?? undefined; this.onState("active"); };
  private onSessionEnd = () => { this.session = undefined; this.onState("ended"); };
  async endSession(): Promise<void> { await this.session?.end(); }
  dispose(): void {
    this.renderer.xr.removeEventListener("sessionstart", this.onSessionStart);
    this.renderer.xr.removeEventListener("sessionend", this.onSessionEnd);
    this.controllers.forEach((controller) => controller.removeFromParent());
    this.button.remove();
  }
}

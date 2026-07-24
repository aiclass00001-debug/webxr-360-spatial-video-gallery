import { demoConfig } from "../config/demoConfig";

export class VideoAsset{
  readonly video=document.createElement("video"); readonly url:string;
  constructor(readonly file:File){this.url=URL.createObjectURL(file);Object.assign(this.video,{src:this.url,preload:"metadata",loop:demoConfig.loop,playsInline:true});}
  load(){return new Promise<void>((resolve,reject)=>{const ok=()=>{clean();resolve()},bad=()=>{clean();reject(new Error("無法解碼：請確認為 MP4 / H.264 + AAC"))},clean=()=>{this.video.removeEventListener("loadedmetadata",ok);this.video.removeEventListener("error",bad)};this.video.addEventListener("loadedmetadata",ok,{once:true});this.video.addEventListener("error",bad,{once:true});this.video.load()})}
  async play(){await this.video.play()}
  pause(){this.video.pause()}
  dispose(){this.video.pause();this.video.removeAttribute("src");this.video.load();URL.revokeObjectURL(this.url)}
}

/** 學生作業只需調整此設定檔，不需要修改 Three.js / WebXR 核心程式。 */
export const demoConfig={
  /** 影片距離（公尺） */ videoDistance:3.5,
  /** 影片寬度（公尺） */ videoWidth:2.8,
  /** 視線與影片中心高度（公尺） */ eyeHeight:1.6,
  /** Phase 2：可用方位角 */ allowedAngles:[0,45,90,135,180,225,270,315],
  /** Phase 5：預設播放模式 */ playbackMode:"sequence" as const,
  /** Phase 5：上一支播完到下一支出現的間隔（秒） */ sequenceInterval:2,
  /** Phase 5：全部影片播完後是否開始新一輪 */ sequenceLoop:true,
  /** Phase 5：顯示時間（秒） */ displayDuration:8,
  /** 啟動影音後自動播放 */ autoplay:true,
  /** 循環播放；Phase 1 預設關閉，播完後隱藏影片 */ loop:false,
  /** Phase 4：每支影片獨立的 HRTF 空間音訊設定 */
  spatialAudio:{
    /** 主音量：0–1 */ volume:0.8,
    /** 開始衰減的參考距離（公尺） */ refDistance:1,
    /** 距離衰減強度 */ rolloffFactor:1,
    /** 最大計算距離（公尺） */ maxDistance:12,
    /** Web Audio 距離模型 */ distanceModel:"inverse" as const
  },
  /** Phase 6：注視播放 */ gazePlayback:false,
  /** Phase 2：可重現亂數種子 */ randomSeed:"DMD-360-001"
} as const;

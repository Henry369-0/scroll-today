/** 全局常量：系列色板 + 手感调参 */
export const PALETTE = {
  paper: '#F2EAD9',
  paperWarm: '#F7EFDC',
  ink: '#2B2B26',
  brick: '#B5482A',
  green: '#3F5C4E',
  mustard: '#D9A441',
} as const;

export const SERIF_FONT = "'Noto Serif SC','Source Han Serif SC','Songti SC','SimSun','STSong',serif";

/** 手感参数（开发文档 §2.1 / §2.3 定稿值） */
export const TUNE = {
  baseSpeed: 120,        // 基础下行速度 px/s
  maxSpeed: 420,         // 速度上限
  speedGrowth: 1.08,     // 每 10 秒 +8%
  spawnStart: 1.4,       // 词条生成间隔起步 s
  spawnEnd: 0.45,        // 词条生成间隔下限 s
  spawnShrinkTime: 90,   // 间隔压满耗时 s
  sizeGrowthTime: 150,   // 词条尺寸随深度增大
  hitboxFactor: 0.8,     // 玩家 hitbox = 视觉 80%（宽容判定）
  lives: 3,
  invincibleTime: 1.5,   // 受击无敌 s
  potionScore: 200,
  nearMissScore: 50,
  nearMissGap: 38,       // 擦身判定横向缝隙 px
  hitStop: 0.08,         // 撞击冻结 s
  shakeHit: 6,
  shakeDeath: 12,
  slowMoScale: 0.3,      // 死亡慢动作
  slowMoTime: 0.8,       // 死亡慢动作时长 s（真实时间）
  pxPerMeter: 40,        // 40px = 1m
  milestoneEvery: 250,   // 每 250m 一个里程碑
} as const;

export const LS_TOP10 = 'scroll.today.top10';
export const LS_SETTINGS = 'scroll.today.settings';

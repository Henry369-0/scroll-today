/** 难度曲线（开发文档 §2.1 定稿值）：速度/生成间隔/尺寸随时间推进 */
import { TUNE } from '../config';

export class Difficulty {
  t = 0;

  reset(): void {
    this.t = 0;
  }

  update(dt: number): void {
    this.t += dt;
  }

  /** 下行速度 px/s：120 起步，每 10s +8%，封顶 420 */
  get speed(): number {
    const v = TUNE.baseSpeed * Math.pow(TUNE.speedGrowth, this.t / 10);
    return Math.min(TUNE.maxSpeed, v);
  }

  /** 词条生成间隔 s：1.4 → 0.45（几何压缩） */
  get spawnInterval(): number {
    const p = Math.min(1, this.t / TUNE.spawnShrinkTime);
    return TUNE.spawnStart * Math.pow(TUNE.spawnEnd / TUNE.spawnStart, p);
  }

  /** 词条尺寸系数（热搜漩涡）：最多 +35% */
  get sizeScale(): number {
    return 1 + Math.min(1, this.t / TUNE.sizeGrowthTime) * 0.35;
  }

  /** 药水生成间隔 s：随难度略变密 */
  get potionInterval(): number {
    return Math.max(9, 14 - this.t / 30);
  }
}

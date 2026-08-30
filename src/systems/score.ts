/** 计分：下行深度（米）+ 药水 200 + near-miss 50（开发文档 §2.1） */
import { TUNE } from '../config';

export class Score {
  depthPx = 0;
  potions = 0;
  nearMiss = 0;
  /** 已播放的里程碑数 */
  milestones = 0;
  private potionScore = TUNE.potionScore;
  private nearMissScore = TUNE.nearMissScore;

  reset(): void {
    this.depthPx = 0;
    this.potions = 0;
    this.nearMiss = 0;
    this.milestones = 0;
  }

  update(dt: number, speedPx: number): void {
    this.depthPx += speedPx * dt;
  }

  get meters(): number {
    return Math.floor(this.depthPx / TUNE.pxPerMeter);
  }

  get points(): number {
    return this.meters + this.potions * this.potionScore + this.nearMiss * this.nearMissScore;
  }

  /** 是否到达新里程碑（每 250m） */
  advanceMilestone(): number | null {
    const should = Math.floor(this.meters / TUNE.milestoneEvery);
    if (should > this.milestones) {
      this.milestones = should;
      return should * TUNE.milestoneEvery;
    }
    return null;
  }
}

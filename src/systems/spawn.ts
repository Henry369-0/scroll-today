/** 生成节奏 + 对象池（词条 40 / 药水 4，复用避免 GC 卡顿） */
import { Headline, makeHeadline, spawnHeadline } from '../entities/headline';
import { Potion, makePotion, spawnPotion } from '../entities/potion';
import { Difficulty } from './difficulty';
import { Rng } from '../core/rng';

const POOL_HEADLINES = 40;
const POOL_POTIONS = 4;

export class Spawner {
  headlines: Headline[] = [];
  potions: Potion[] = [];
  private timer = 0.9;      // 首个词条稍等
  private potionTimer = 8;  // 首瓶药水
  private lastCenterX = -9999;
  private nextText: () => string;

  constructor(nextText: () => string) {
    this.nextText = nextText;
    for (let i = 0; i < POOL_HEADLINES; i++) this.headlines.push(makeHeadline());
    for (let i = 0; i < POOL_POTIONS; i++) this.potions.push(makePotion());
  }

  update(dt: number, diff: Difficulty, rng: Rng, w: number, h: number, ctx: CanvasRenderingContext2D): void {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = diff.spawnInterval * rng.range(0.85, 1.15);
      this.spawnOne(rng, w, h, ctx, diff);
    }
    this.potionTimer -= dt;
    if (this.potionTimer <= 0) {
      this.potionTimer = diff.potionInterval * rng.range(0.8, 1.2);
      const p = this.potions.find((q) => !q.active);
      if (p) {
        spawnPotion(p, rng.range(w * 0.12, w * 0.88), h + 30);
      }
    }
  }

  private spawnOne(rng: Rng, w: number, h: number, ctx: CanvasRenderingContext2D, diff: Difficulty): void {
    const hl = this.headlines.find((x) => !x.active);
    if (!hl) return;

    const margin = 30;
    const maxBoxW = Math.min(w * 0.62, 360 * diff.sizeScale);
    const minX = margin + maxBoxW / 2;
    const maxX = w - margin - maxBoxW / 2;

    // 保证可通行：与上一条词条中心保持横向错位（留出 >=130px 缝隙走廊）
    let cx = rng.range(minX, maxX);
    const needGap = 130 + maxBoxW / 2;
    if (Math.abs(cx - this.lastCenterX) < needGap) {
      // 往缝隙更大的一侧挪
      if (this.lastCenterX < 0 || this.lastCenterX > w / 2) {
        cx = rng.range(minX, Math.max(minX + 10, this.lastCenterX - needGap));
      } else {
        cx = rng.range(Math.min(maxX - 10, this.lastCenterX + needGap), maxX);
      }
      cx = Math.max(minX, Math.min(maxX, cx));
    }
    this.lastCenterX = cx;

    spawnHeadline(hl, this.nextText(), cx, h + 60, diff.sizeScale, ctx, maxBoxW);
  }

  clear(): void {
    for (const h of this.headlines) h.active = false;
    for (const p of this.potions) p.active = false;
    this.lastCenterX = -9999;
    this.timer = 0.9;
    this.potionTimer = 8;
  }
}

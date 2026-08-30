/** 剪报碎裂纸屑粒子池 + 漂浮文字 */
import { PALETTE } from '../config';

const PAPER_COLORS = [PALETTE.paperWarm, PALETTE.mustard, PALETTE.brick, PALETTE.green, PALETTE.ink];

interface Particle {
  active: boolean;
  x: number; y: number;
  vx: number; vy: number;
  rot: number; vr: number;
  w: number; h: number;
  color: string;
  life: number; maxLife: number;
}

export class Particles {
  private pool: Particle[] = [];

  constructor(size = 320) {
    for (let i = 0; i < size; i++) {
      this.pool.push({
        active: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0,
        w: 0, h: 0, color: '#fff', life: 0, maxLife: 1,
      });
    }
  }

  burst(x: number, y: number, count: number, power = 1): void {
    let n = 0;
    for (const p of this.pool) {
      if (p.active) continue;
      const ang = Math.random() * Math.PI * 2;
      const spd = (60 + Math.random() * 240) * power;
      p.active = true;
      p.x = x; p.y = y;
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd - 120 * power;
      p.rot = Math.random() * Math.PI;
      p.vr = (Math.random() - 0.5) * 12;
      p.w = 3 + Math.random() * 6;
      p.h = 4 + Math.random() * 8;
      p.color = PAPER_COLORS[Math.floor(Math.random() * PAPER_COLORS.length)];
      p.maxLife = 0.6 + Math.random() * 0.7;
      p.life = p.maxLife;
      if (++n >= count) break;
    }
  }

  update(dt: number, scrollDy: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.vy += 620 * dt;         // 重力
      p.vx *= 0.99; p.vy *= 0.99;
      p.x += p.vx * dt;
      p.y += p.vy * dt - scrollDy; // 跟随世界滚动
      p.rot += p.vr * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      const a = Math.min(1, p.life / (p.maxLife * 0.5));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
  }

  clear(): void {
    for (const p of this.pool) p.active = false;
  }
}

/** 漂浮文字（好险 +50 / 里程碑 / 回命） */
interface FloatText {
  active: boolean;
  text: string;
  x: number; y: number;
  vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
}

export class FloatTexts {
  private pool: FloatText[] = [];

  constructor(size = 24) {
    for (let i = 0; i < size; i++) {
      this.pool.push({ active: false, text: '', x: 0, y: 0, vy: 0, life: 0, maxLife: 1, size: 16, color: '#000' });
    }
  }

  push(text: string, x: number, y: number, color: string, size = 17): void {
    for (const t of this.pool) {
      if (t.active) continue;
      t.active = true;
      t.text = text; t.x = x; t.y = y;
      t.vy = -46; t.maxLife = 0.9; t.life = t.maxLife;
      t.size = size; t.color = color;
      return;
    }
  }

  update(dt: number): void {
    for (const t of this.pool) {
      if (!t.active) continue;
      t.life -= dt;
      if (t.life <= 0) { t.active = false; continue; }
      t.y += t.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D, font: string): void {
    for (const t of this.pool) {
      if (!t.active) continue;
      const a = Math.min(1, t.life / (t.maxLife * 0.6));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `900 ${t.size}px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }

  clear(): void {
    for (const t of this.pool) t.active = false;
  }
}

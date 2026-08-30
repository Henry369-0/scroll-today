/** 菜单/结算背后的氛围背景：纸色 + 漂浮剪报 + 纸屑视差 */
import { HEADLINES } from '../data/headlines';
import { makeHeadline, drawHeadline, Headline } from '../entities/headline';
import { PALETTE } from '../config';

interface Bit { x: number; y: number; s: number; vy: number; rot: number; vr: number }

export class Ambient {
  private bits: Bit[] = [];
  private clippings: Headline[] = [];
  private w = 0; private h = 0;
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.resize(window.innerWidth, window.innerHeight);
    for (let i = 0; i < 34; i++) {
      this.bits.push({
        x: Math.random() * this.w, y: Math.random() * this.h,
        s: 2 + Math.random() * 4,
        vy: 8 + Math.random() * 26,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.6,
      });
    }
    for (let i = 0; i < 5; i++) {
      const h = makeHeadline();
      spawnAmbient(h, this.w, this.h);
      this.clippings.push(h);
    }
  }

  resize(w: number, h: number): void {
    this.w = w; this.h = h;
  }

  update(dt: number): void {
    for (const b of this.bits) {
      b.y -= b.vy * dt;
      b.rot += b.vr * dt;
      if (b.y < -10) { b.y = this.h + 10; b.x = Math.random() * this.w; }
    }
    for (const c of this.clippings) {
      c.y -= c.vy * dt;
      c.rot += c.vr * dt;
      if (c.y < -80) spawnAmbient(c, this.w, this.h);
    }
  }

  render(): void {
    const ctx = this.ctx;
    // 纸色渐变
    const g = ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, PALETTE.paper);
    g.addColorStop(1, '#E0D4B8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.save();
    ctx.globalAlpha = 0.14;
    for (const b of this.bits) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(-b.s / 2, -b.s, b.s, b.s * 2);
      ctx.restore();
    }
    ctx.restore();

    // 淡淡的剪报漂浮
    for (const c of this.clippings) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      drawHeadline(ctx, c);
      ctx.restore();
    }
  }
}

function spawnAmbient(h: Headline, w: number, hh: number): void {
  h.active = true;
  h.text = HEADLINES[Math.floor(Math.random() * HEADLINES.length)];
  h.w = 120 + Math.random() * 160;
  h.h = 44 + Math.random() * 24;
  h.x = 40 + Math.random() * (w - 80);
  h.y = hh + 100 + Math.random() * 300;
  h.rot = (Math.random() - 0.5) * 0.2;
  h.vy = 12 + Math.random() * 20;
  h.vr = (Math.random() - 0.5) * 0.05;
  h.torn = Array.from({ length: 28 }, () => 1.5 + Math.random() * 3.5);
  h.lines = [h.text];
  h.lineH = 20;
  h.fontSize = 15;
  h.scale = 1;
  h.pop = 0;
  h.checked = false;
}

/** 简笔小人：横向跟随鼠标 X（备选键位），hitbox = 视觉 80% */
import { PALETTE, TUNE } from '../config';

const W = 30;   // 视觉宽
const H = 46;   // 视觉高

export class Player {
  x = 0;
  y = 0;
  /** 无敌剩余时间 */
  invincible = 0;
  /** 受击闪白 */
  flash = 0;
  private walkT = 0;

  reset(w: number, h: number): void {
    this.x = w / 2;
    this.y = h * 0.72;
    this.invincible = 0;
    this.flash = 0;
  }

  get width(): number { return W; }
  get height(): number { return H; }

  /** 80% 宽容 hitbox（动作游戏惯例） */
  get box(): { x: number; y: number; w: number; h: number } {
    const w = W * TUNE.hitboxFactor;
    const h = H * TUNE.hitboxFactor;
    return { x: this.x - w / 2, y: this.y - h / 2, w, h };
  }

  update(dt: number, targetX: number | null, keyX: number, w: number): void {
    const speed = 420;
    if (targetX !== null) {
      // 鼠标跟随：快速平滑，带一点惯性
      this.x += (targetX - this.x) * Math.min(1, 14 * dt);
    }
    if (keyX !== 0) {
      this.x += keyX * speed * dt;
    }
    this.x = Math.max(W / 2 + 4, Math.min(w - W / 2 - 4, this.x));
    if (this.invincible > 0) this.invincible -= dt;
    if (this.flash > 0) this.flash -= dt;
    this.walkT += dt * (6 + speed * 0.004);
  }

  /** 画简笔小人：圆头 + 躯干 + 摆臂摆腿，受击闪白、无敌期半透明闪烁 */
  draw(ctx: CanvasRenderingContext2D): void {
    const { ink, brick } = PALETTE;
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.invincible > 0 && Math.floor(this.invincible * 10) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }
    const color = this.flash > 0 ? '#FFFFFF' : ink;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    const swing = Math.sin(this.walkT) * 6;
    const bob = Math.abs(Math.cos(this.walkT)) * 1.5;

    // 头
    ctx.beginPath();
    ctx.arc(0, -H / 2 + 7 - bob, 8, 0, Math.PI * 2);
    ctx.stroke();
    // 表情：下坠时的紧张眉眼
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -H / 2 + 5 - bob); ctx.lineTo(-1.5, -H / 2 + 6.5 - bob);
    ctx.moveTo(4, -H / 2 + 5 - bob); ctx.lineTo(1.5, -H / 2 + 6.5 - bob);
    ctx.stroke();
    // 躯干
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, -H / 2 + 15 - bob);
    ctx.lineTo(0, 4);
    ctx.stroke();
    // 手臂：一只抱头，一只乱舞
    ctx.beginPath();
    ctx.moveTo(0, -H / 2 + 18 - bob);
    ctx.lineTo(-9, -H / 2 + 8 - bob);
    ctx.moveTo(0, -H / 2 + 18 - bob);
    ctx.lineTo(8 + swing * 0.6, -H / 2 + 24 - bob);
    ctx.stroke();
    // 腿：奔跑摆动
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(swing, H / 2);
    ctx.moveTo(0, 4);
    ctx.lineTo(-swing, H / 2);
    ctx.stroke();
    // 围巾（砖红小旗，飘起来增加动感）
    if (this.flash <= 0) {
      ctx.strokeStyle = brick;
      ctx.lineWidth = 3;
      const flutter = Math.sin(this.walkT * 1.7) * 3;
      ctx.beginPath();
      ctx.moveTo(0, -H / 2 + 16 - bob);
      ctx.quadraticCurveTo(-8, -H / 2 + 20 - bob, -14 + flutter, -H / 2 + 14 - bob);
      ctx.stroke();
    }
    ctx.restore();
  }
}

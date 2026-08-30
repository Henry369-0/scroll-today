/** 冷静药水：墨绿小瓶 + 芥末黄标签，上下浮动，吃到回 1 命 */
import { PALETTE } from '../config';

export interface Potion {
  active: boolean;
  x: number; y: number;
  t: number; // 浮动相位
}

export function makePotion(): Potion {
  return { active: false, x: 0, y: 0, t: 0 };
}

export function spawnPotion(p: Potion, x: number, y: number): void {
  p.active = true;
  p.x = x;
  p.y = y;
  p.t = Math.random() * Math.PI * 2;
}

export function updatePotion(p: Potion, dy: number, dt: number): void {
  p.y -= dy;
  p.t += dt * 3;
}

export function drawPotion(ctx: CanvasRenderingContext2D, p: Potion): void {
  const bob = Math.sin(p.t) * 4;
  ctx.save();
  ctx.translate(p.x, p.y + bob);

  // 光环
  ctx.strokeStyle = 'rgba(63,92,78,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 20 + Math.sin(p.t * 1.4) * 2, 0, Math.PI * 2);
  ctx.stroke();

  // 瓶身（墨绿圆角矩形）
  ctx.fillStyle = PALETTE.green;
  roundRect(ctx, -9, -10, 18, 24, 5);
  ctx.fill();
  // 高光
  ctx.fillStyle = 'rgba(242,234,217,0.35)';
  roundRect(ctx, -6, -6, 4, 12, 2);
  ctx.fill();
  // 木塞
  ctx.fillStyle = '#8A6B3D';
  ctx.fillRect(-4, -16, 8, 7);
  // 芥末黄标签
  ctx.fillStyle = PALETTE.mustard;
  ctx.fillRect(-8, -2, 16, 10);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '900 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('静', 0, 3.5);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 药水拾取判定圆半径 */
export const POTION_RADIUS = 24;

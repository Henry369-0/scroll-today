/** 热搜词条 = 泛黄报纸剪报块：衬线大字 + 撕纸边缘 + 轻微随机旋转，对象池复用 */
import { PALETTE, SERIF_FONT } from '../config';

export interface Headline {
  active: boolean;
  text: string;
  x: number; y: number;      // 中心坐标
  w: number; h: number;
  rot: number;               // 弧度
  scale: number;             // 尺寸随深度增大
  pop: number;               // near-miss 反馈：短暂放大 1.06
  lines: string[];
  lineH: number;
  fontSize: number;
  torn: number[];            // 撕纸边缘抖动（视觉随机，不入种子序列）
  checked: boolean;          // near-miss 已判定
  vy: number;                // 氛围模式下的自漂速度
  vr: number;
}

export function makeHeadline(): Headline {
  return {
    active: false, text: '', x: 0, y: 0, w: 0, h: 0, rot: 0, scale: 1, pop: 0,
    lines: [], lineH: 0, fontSize: 18, torn: [], checked: false, vy: 0, vr: 0,
  };
}

const TORN_N = 7; // 每条边 7 段抖动

export function spawnHeadline(
  h: Headline,
  text: string,
  x: number,
  y: number,
  scale: number,
  ctx: CanvasRenderingContext2D,
  maxW: number,
): void {
  h.active = true;
  h.text = text;
  h.scale = scale;
  h.pop = 0;
  h.checked = false;

  // 排版：字号自适应，最多 2 行
  const base = 19 * scale;
  ctx.font = `900 ${base}px ${SERIF_FONT}`;
  const textW = ctx.measureText(text).width;
  let fontSize = base;
  let lines: string[] = [];
  const boxMax = Math.min(maxW, 340 * scale);

  if (textW + 34 <= boxMax) {
    lines = [text];
  } else {
    // 简单按字符对半折行（中文）
    fontSize = base * 0.92;
    ctx.font = `900 ${fontSize}px ${SERIF_FONT}`;
    const half = Math.ceil(text.length / 2);
    lines = [text.slice(0, half), text.slice(half)];
  }
  h.lines = lines;
  h.fontSize = fontSize;
  h.lineH = fontSize * 1.3;
  const lineMax = Math.max(...lines.map((l) => ctx.measureText(l).width));
  h.w = Math.min(boxMax, lineMax + 34);
  h.h = h.lineH * lines.length + 18;
  h.x = x;
  h.y = y;
  h.rot = (Math.random() - 0.5) * (10 * Math.PI / 180); // ±5°，视觉随机
  h.torn = Array.from({ length: TORN_N * 4 }, () => 1.5 + Math.random() * 3.5);
}

export function updateHeadline(h: Headline, dy: number, dt: number): void {
  h.y -= dy;
  if (h.pop > 0) h.pop = Math.max(0, h.pop - dt * 4);
}

/** 撕纸边缘矩形路径 */
function tornPath(ctx: CanvasRenderingContext2D, w: number, hh: number, torn: number[]): void {
  const hw = w / 2, h2 = hh / 2;
  ctx.beginPath();
  ctx.moveTo(-hw - torn[0], -h2);
  for (let i = 1; i < TORN_N; i++) {
    const t = i / TORN_N;
    ctx.lineTo(-hw + w * t, -h2 - torn[i] + 2.5);
  }
  ctx.lineTo(hw + torn[TORN_N], -h2);
  for (let i = 1; i < TORN_N; i++) {
    const t = i / TORN_N;
    ctx.lineTo(hw, -h2 + hh * t + torn[TORN_N + i] - 2.5);
  }
  ctx.lineTo(hw + torn[TORN_N * 2], h2);
  for (let i = 1; i < TORN_N; i++) {
    const t = i / TORN_N;
    ctx.lineTo(hw - w * t, h2 + torn[TORN_N * 2 + i] - 2.5);
  }
  ctx.lineTo(-hw - torn[TORN_N * 3], h2);
  for (let i = 1; i < TORN_N; i++) {
    const t = i / TORN_N;
    ctx.lineTo(-hw, h2 - hh * t + torn[TORN_N * 3 + i] - 2.5);
  }
  ctx.closePath();
}

export function drawHeadline(ctx: CanvasRenderingContext2D, h: Headline): void {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(h.rot);
  const s = h.scale * (1 + h.pop * 0.06);
  ctx.scale(s, s);

  // 投影
  ctx.save();
  ctx.shadowColor = 'rgba(43,43,38,0.28)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = PALETTE.paperWarm;
  tornPath(ctx, h.w, h.h, h.torn);
  ctx.fill();
  ctx.restore();

  // 描边 + 内框
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  tornPath(ctx, h.w, h.h, h.torn);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeRect(-h.w / 2 + 5, -h.h / 2 + 5, h.w - 10, h.h - 10);

  // 文字
  ctx.fillStyle = PALETTE.ink;
  ctx.font = `900 ${h.fontSize}px ${SERIF_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const startY = -((h.lines.length - 1) * h.lineH) / 2;
  h.lines.forEach((l, i) => {
    ctx.fillText(l, 0, startY + i * h.lineH + 1);
  });

  // 角标「热」章
  const bx = h.w / 2 - 13, by = -h.h / 2 + 11;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-0.35);
  ctx.strokeStyle = PALETTE.brick;
  ctx.fillStyle = PALETTE.brick;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(-9, -9, 18, 18);
  ctx.font = `900 13px ${SERIF_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('热', 0, 1);
  ctx.restore();

  ctx.restore();
}

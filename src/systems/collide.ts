/** AABB 碰撞（宽容 hitbox）+ near-miss 擦身判定 */
import { Headline } from '../entities/headline';
import { POTION_RADIUS, Potion } from '../entities/potion';
import { Player } from '../entities/player';
import { TUNE } from '../config';

export interface Box { x: number; y: number; w: number; h: number }

export function overlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** 词条盒（旋转 ±5° 很小，按轴对齐处理并内缩 8% 补偿撕纸边） */
export function headlineBox(h: Headline): Box {
  const shrink = 0.92;
  const w = h.w * shrink, hh = h.h * shrink;
  return { x: h.x - w / 2, y: h.y - hh / 2, w, h: hh };
}

export function hitsPlayer(h: Headline, player: Player): boolean {
  if (player.invincible > 0) return false;
  return overlap(headlineBox(h), player.box);
}

/** 横向缝隙：玩家盒与词条盒在 x 轴上的间隔（相交时为负） */
export function lateralGap(h: Headline, player: Player): number {
  const hb = headlineBox(h);
  const pb = player.box;
  const dx = Math.max(hb.x - (pb.x + pb.w), pb.x - (hb.x + hb.w));
  return dx;
}

/** near-miss：词条中心越过玩家中心时判定一次 */
export function checkNearMiss(h: Headline, player: Player): boolean {
  if (h.checked) return false;
  if (h.y < player.y) {
    h.checked = true;
    const gap = lateralGap(h, player);
    return gap >= 0 && gap <= TUNE.nearMissGap;
  }
  return false;
}

export function hitsPotion(p: Potion, player: Player): boolean {
  const pb = player.box;
  const cx = Math.max(pb.x, Math.min(p.x, pb.x + pb.w));
  const cy = Math.max(pb.y, Math.min(p.y, pb.y + pb.h));
  const dx = p.x - cx, dy = p.y - cy;
  return dx * dx + dy * dy <= POTION_RADIUS * POTION_RADIUS;
}

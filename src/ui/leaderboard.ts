/** 本地 Top10（localStorage，v1 明确不做云端） */
import { LS_TOP10 } from '../config';

export interface ScoreEntry {
  score: number;
  meters: number;
  sec: number;
  potions: number;
  nearMiss: number;
  headline: string;
  mode: 'normal' | 'daily';
  date: string;
}

export function loadTop10(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(LS_TOP10);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ScoreEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(entries: ScoreEntry[]): void {
  try {
    localStorage.setItem(LS_TOP10, JSON.stringify(entries));
  } catch { /* 隐身模式等场景忽略 */ }
}

/** 插入成绩，返回名次（1 起）；未进榜返回 0 */
export function addScore(entry: ScoreEntry): number {
  const list = loadTop10();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const top = list.slice(0, 10);
  save(top);
  const idx = top.indexOf(entry);
  return idx === -1 ? 0 : idx + 1;
}

export function renderBoard(el: HTMLElement, highlight?: ScoreEntry): void {
  const list = loadTop10();
  if (list.length === 0) {
    el.innerHTML = '<li class="board-empty">虚位以待——去刷出第一个纪录</li>';
    return;
  }
  el.innerHTML = '';
  list.forEach((e, i) => {
    const li = document.createElement('li');
    if (highlight && e === highlight) li.classList.add('highlight');
    const sec = e.sec >= 60 ? `${Math.floor(e.sec / 60)}分${Math.round(e.sec % 60)}秒` : `${Math.round(e.sec)}秒`;
    li.innerHTML =
      `<span class="rk">${String(i + 1).padStart(2, '0')}</span>` +
      `<span class="sc">${e.score}</span>` +
      `<span class="mt">${e.meters}m</span>` +
      `<span class="hd">${escapeHtml(e.headline)}</span>` +
      `<span class="me">${e.mode === 'daily' ? '每日' : ''} ${sec}</span>`;
    el.appendChild(li);
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

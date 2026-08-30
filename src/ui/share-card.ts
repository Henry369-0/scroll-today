/** 号外！成绩卡：1080×1440 PNG（html-to-image 导出，系列第三件同款） */
import { toSvg } from 'html-to-image';
import { todayLabel } from '../core/rng';

export interface CardData {
  headline: string;   // 致死词条
  meters: number;
  sec: number;
  potions: number;
  nearMiss: number;
  score: number;
  mode: 'normal' | 'daily';
}

const CARD_CLASS = 'share-card';

/** 在离屏舞台构建卡片 DOM（1080×1440） */
export function buildCard(data: CardData): HTMLElement {
  const stage = document.getElementById('card-stage')!;
  stage.innerHTML = '';

  const card = document.createElement('div');
  card.className = CARD_CLASS;
  const sec = data.sec >= 60 ? `${Math.floor(data.sec / 60)} 分 ${Math.round(data.sec % 60)} 秒` : `${Math.round(data.sec)} 秒`;

  card.innerHTML = `
    <div class="sc-inner">
      <div class="sc-kicker">scroll.today 快讯</div>
      <div class="sc-huawai">号外！！</div>
      <div class="sc-killed">你被</div>
      <div class="sc-headline">『${escapeHtml(data.headline)}』</div>
      <div class="sc-dead">压死了</div>
      <div class="sc-divider"></div>
      <div class="sc-stats">
        <div class="sc-stat"><b>${data.score}</b><span>总积分</span></div>
        <div class="sc-stat"><b>${sec}</b><span>生存时间</span></div>
        <div class="sc-stat"><b>${data.meters}m</b><span>下行深度</span></div>
        <div class="sc-stat"><b>×${data.potions}</b><span>药水</span></div>
        <div class="sc-stat"><b>${data.nearMiss}</b><span>好险</span></div>
      </div>
      <div class="sc-date">${todayLabel()} · ${data.mode === 'daily' ? '每日榜' : '随机局'}</div>
      <div class="sc-brand">scroll.today · 热搜求生</div>
      <div class="sc-stamp">压死<br>认证</div>
    </div>
  `;
  stage.appendChild(card);
  return card;
}

/**
 * DOM → PNG dataURL。
 * 不用库的 toPng：其 createImage 依赖 requestAnimationFrame，
 * 后台/被节流标签页里 rAF 停摆会导致导出永久挂起；toSvg 路径全是普通 Promise，
 * 光栅化自己 drawImage 完成，任何可见性状态下都能出图。
 */
export async function renderCardPng(card: HTMLElement, width = 1080, height = 1440): Promise<string> {
  const svgDataUrl = await toSvg(card, { width, height, cacheBust: true });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('card svg decode failed'));
    im.src = svgDataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d')!;
  c.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}

/** 导出 PNG 并触发下载，返回 dataURL（用于预览） */
export async function exportCard(card: HTMLElement): Promise<string> {
  const dataUrl = await renderCardPng(card);
  const a = document.createElement('a');
  a.download = `号外-热搜求生-${todayLabel().replace(/\./g, '')}.png`;
  a.href = dataUrl;
  a.click();
  return dataUrl;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

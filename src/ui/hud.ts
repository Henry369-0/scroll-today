/** HUD：深度 + 积分 + 三条命（小铅笔，失去划掉）+ 刷力条 */
import { sfx } from '../audio/sfx';

const PENCIL_SVG = `<svg class="pencil" viewBox="0 0 60 24" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="#2B2B26" stroke-width="2.4" stroke-linejoin="round">
    <rect x="14" y="5" width="34" height="14" fill="#D9A441" class="body"/>
    <path d="M14 5 L4 12 L14 19 Z" fill="#F2EAD9" class="wood"/>
    <path d="M8.4 8.7 L4 12 L8.4 15.3 Z" fill="#2B2B26" class="lead"/>
    <rect x="48" y="5" width="8" height="14" fill="#B5482A"/>
    <line class="strike" x1="2" y1="22" x2="58" y2="2" stroke="#B5482A" stroke-width="2.6" visibility="hidden"/>
  </g>
</svg>`;

export class Hud {
  private el = {
    root: document.getElementById('hud')!,
    depth: document.getElementById('hud-depth')!,
    score: document.getElementById('hud-score')!,
    boost: document.getElementById('hud-boost-bar')!,
    lives: document.getElementById('hud-lives')!,
    mode: document.getElementById('hud-mode')!,
  };
  private pencils: SVGSVGElement[] = [];

  show(mode: 'normal' | 'daily'): void {
    this.el.root.classList.remove('hidden');
    this.el.mode.classList.toggle('hidden', mode !== 'daily');
  }

  hide(): void {
    this.el.root.classList.add('hidden');
  }

  setLives(lives: number, max: number): void {
    if (this.pencils.length !== max) {
      this.el.lives.innerHTML = '';
      this.pencils = [];
      for (let i = 0; i < max; i++) {
        const tpl = document.createElement('template');
        tpl.innerHTML = PENCIL_SVG.trim();
        const svg = tpl.content.firstChild as SVGSVGElement;
        this.el.lives.appendChild(svg);
        this.pencils.push(svg);
      }
    }
    this.pencils.forEach((p, i) => {
      const alive = i < lives;
      p.classList.toggle('lost', !alive);
      const strike = p.querySelector('.strike') as SVGLineElement;
      if (strike) strike.setAttribute('visibility', alive ? 'hidden' : 'visible');
    });
  }

  update(meters: number, points: number, boost: number): void {
    this.el.depth.textContent = String(meters);
    this.el.score.textContent = String(points);
    this.el.boost.style.width = `${Math.round(boost * 100)}%`;
  }

  /** 里程碑闪一下深度数字 */
  flashMilestone(): void {
    this.el.depth.style.color = '#B5482A';
    setTimeout(() => { this.el.depth.style.color = ''; }, 400);
    sfx.milestone();
  }
}

/** 游戏场景：滚动求生主循环（M1 核心玩法 + M2 juice） */
import { Input } from '../core/input';
import { Rng } from '../core/rng';
import { PALETTE, TUNE, SERIF_FONT } from '../config';
import { Player } from '../entities/player';
import { Headline, drawHeadline, updateHeadline } from '../entities/headline';
import { drawPotion, updatePotion } from '../entities/potion';
import { FloatTexts, Particles } from '../entities/particles';
import { Difficulty } from '../systems/difficulty';
import { Spawner } from '../systems/spawn';
import { checkNearMiss, headlineBox, hitsPlayer, hitsPotion } from '../systems/collide';
import { Score } from '../systems/score';
import { GameMode, makeRng } from '../data/daily';
import { sfx } from '../audio/sfx';
import { Hud } from '../ui/hud';

export interface RunResult {
  mode: GameMode;
  meters: number;
  sec: number;
  potions: number;
  nearMiss: number;
  score: number;
  headline: string;
}

export interface PlaySettings {
  sound: boolean;
  juice: boolean;
}

interface AmbientBit { x: number; y: number; s: number; rot: number }

export class PlayScene {
  private player = new Player();
  private diff = new Difficulty();
  private score = new Score();
  private spawner!: Spawner;
  private particles = new Particles();
  private floats = new FloatTexts();
  private rng!: Rng;
  private items: string[] = [];
  private mode: GameMode = 'normal';

  private state: 'running' | 'dying' = 'running';
  private dyingTimer = 0;
  private deathHeadline = '';
  private lives = TUNE.lives;
  private elapsed = 0;
  private shakeMag = 0;
  private shakeX = 0; private shakeY = 0;
  private ambientBits: AmbientBit[] = [];
  private tumble = 0;

  private w = 0; private h = 0;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private input: Input,
    private hud: Hud,
    private settings: PlaySettings,
    private onDeath: (r: RunResult) => void,
    private loopCtl: { hitStop: number; timeScale: number },
  ) {}

  enter(mode: GameMode, items: string[], w: number, h: number): void {
    this.mode = mode;
    this.items = items;
    this.w = w; this.h = h;
    this.rng = makeRng(mode);
    this.spawner = new Spawner(() => this.rng.pick(this.items));
    this.spawner.clear();
    this.player.reset(w, h);
    this.diff.reset();
    this.score.reset();
    this.particles.clear();
    this.floats.clear();
    this.lives = TUNE.lives;
    this.elapsed = 0;
    this.state = 'running';
    this.dyingTimer = 0;
    this.deathHeadline = '';
    this.shakeMag = 0;
    this.tumble = 0;
    this.loopCtl.timeScale = 1;
    this.loopCtl.hitStop = 0;
    this.input.reset();
    this.ambientBits = Array.from({ length: 30 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      s: 2 + Math.random() * 4,
      rot: Math.random() * Math.PI,
    }));
    this.hud.show(mode);
    this.hud.setLives(this.lives, TUNE.lives);
    this.hud.update(0, 0, 0);
  }

  resize(w: number, h: number): void {
    this.w = w; this.h = h;
  }

  get isDying(): boolean {
    return this.state === 'dying';
  }

  update(dt: number, rawDt: number): void {
    this.input.update(dt);

    if (this.state === 'dying') {
      // 慢动作下坠（真实时间计时，防止 timeScale 拖长）
      this.dyingTimer += rawDt;
      this.tumble += dt * 5;
      const dy = this.diff.speed * dt;
      for (const h of this.spawner.headlines) if (h.active) updateHeadline(h, dy, dt);
      for (const p of this.spawner.potions) if (p.active) updatePotion(p, dy, dt);
      this.particles.update(dt, dy * 0.3);
      this.floats.update(dt);
      this.updateShake(dt);
      if (this.dyingTimer >= (this.settings.juice ? TUNE.slowMoTime : 0.35)) {
        this.onDeath(this.buildResult());
      }
      return;
    }

    this.elapsed += dt;
    this.diff.update(dt);

    // 速度：难度曲线 × 刷力（滚轮↓加速，↑刹车）
    const speed = this.diff.speed * (1 + this.input.boost);
    const dy = speed * dt;
    this.score.update(dt, speed);

    // 生成
    this.spawner.update(dt, this.diff, this.rng, this.w, this.h, this.ctx);

    // 移动
    for (const h of this.spawner.headlines) if (h.active) updateHeadline(h, dy, dt);
    for (const p of this.spawner.potions) if (p.active) updatePotion(p, dy, dt);

    // 玩家
    this.player.update(dt, this.input.pointerX, this.input.keyX, this.w);

    // 碰撞
    for (const h of this.spawner.headlines) {
      if (!h.active) continue;
      if (hitsPlayer(h, this.player)) {
        const died = this.onHit(h);
        if (died) return;
      } else if (checkNearMiss(h, this.player)) {
        this.score.nearMiss++;
        sfx.near();
        h.pop = 1;
        if (this.settings.juice) this.floats.push('好险 +50', this.player.x, this.player.y - 40, PALETTE.mustard, 18);
      }
      // 出屏回收
      if (h.active && h.y < -h.h * h.scale - 80) h.active = false;
    }

    for (const p of this.spawner.potions) {
      if (!p.active) continue;
      if (hitsPotion(p, this.player)) {
        p.active = false;
        this.score.potions++;
        sfx.pickup();
        if (this.lives < TUNE.lives) {
          this.lives++;
          this.hud.setLives(this.lives, TUNE.lives);
          this.floats.push('+1 命', p.x, p.y - 20, PALETTE.green, 20);
        } else {
          this.floats.push(`+${TUNE.potionScore}（满命）`, p.x, p.y - 20, PALETTE.green, 16);
        }
        if (this.settings.juice) this.particles.burst(p.x, p.y, 14, 0.7);
      }
      if (p.active && p.y < -60) p.active = false;
    }

    // 里程碑
    const m = this.score.advanceMilestone();
    if (m !== null) {
      sfx.milestone();
      this.hud.flashMilestone();
      if (this.settings.juice) {
        this.floats.push(`${m}m !`, this.w / 2, this.h * 0.3, PALETTE.brick, 34);
      }
    }

    // 粒子 / 漂浮字 / 背景纸屑
    this.particles.update(dt, dy * 0.25);
    this.floats.update(dt);
    for (const b of this.ambientBits) {
      b.y -= speed * 0.15 * dt; // 视差：背景纸屑慢速上浮
      b.rot += 0.3 * dt;
      if (b.y < -8) { b.y = this.h + 8; b.x = Math.random() * this.w; }
    }
    this.updateShake(dt);

    this.hud.update(this.score.meters, this.score.points, this.input.boost);
  }

  private onHit(h: Headline): boolean {
    const hb = headlineBox(h);
    const cx = Math.max(hb.x, Math.min(this.player.x, hb.x + hb.w));
    const cy = Math.max(hb.y, Math.min(this.player.y, hb.y + hb.h));
    this.lives--;
    sfx.hit();

    if (this.settings.juice) {
      this.loopCtl.hitStop = TUNE.hitStop;
      this.shakeMag = TUNE.shakeHit;
      this.particles.burst(cx, cy, 30, 1.1);
      this.floats.push('-1 命', this.player.x, this.player.y - 44, PALETTE.brick, 20);
    }
    h.checked = true;

    if (this.lives > 0) {
      this.player.invincible = TUNE.invincibleTime;
      this.player.flash = 0.12;
      this.hud.setLives(this.lives, TUNE.lives);
      return false;
    }
    // 死亡：慢动作 + 大震屏 + 纸屑爆发
    this.state = 'dying';
    this.dyingTimer = 0;
    this.deathHeadline = h.text;
    this.hud.setLives(0, TUNE.lives);
    if (this.settings.juice) {
      this.loopCtl.timeScale = TUNE.slowMoScale;
      this.shakeMag = TUNE.shakeDeath;
      this.particles.burst(this.player.x, this.player.y, 70, 1.6);
    }
    sfx.death();
    return true;
  }

  private buildResult(): RunResult {
    return {
      mode: this.mode,
      meters: this.score.meters,
      sec: this.elapsed,
      potions: this.score.potions,
      nearMiss: this.score.nearMiss,
      score: this.score.points,
      headline: this.deathHeadline,
    };
  }

  private updateShake(dt: number): void {
    if (!this.settings.juice) { this.shakeMag = 0; return; }
    if (this.shakeMag > 0) {
      this.shakeMag = Math.max(0, this.shakeMag - dt * 18);
      this.shakeX = (Math.random() - 0.5) * 2 * this.shakeMag;
      this.shakeY = (Math.random() - 0.5) * 2 * this.shakeMag;
    } else {
      this.shakeX = 0; this.shakeY = 0;
    }
  }

  render(alpha: number): void {
    const ctx = this.ctx;
    const { w, h } = this;

    // 背景：纸色随深度渐深（越掉越暗）
    const depthT = Math.min(1, this.score.meters / 1500);
    const mix = (a: number, b: number) => Math.round(a + (b - a) * depthT);
    const top = `rgb(${mix(242, 205)}, ${mix(234, 193)}, ${mix(217, 156)})`;
    const bottom = `rgb(${mix(226, 168)}, ${mix(216, 152)}, ${mix(196, 122)})`;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    // 深度标尺：左缘每 10m 一格
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = PALETTE.ink;
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `11px ${SERIF_FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const py = this.player.y;
    const curM = this.score.depthPx / TUNE.pxPerMeter;
    const startM = Math.max(0, Math.floor((curM - (py + 60) / TUNE.pxPerMeter) / 10) * 10);
    const endM = curM + (h - py + 60) / TUNE.pxPerMeter;
    for (let m = startM; m <= endM; m += 10) {
      const sy = py + (m * TUNE.pxPerMeter - this.score.depthPx);
      if (sy < -20 || sy > h + 20) continue;
      const major = m % 50 === 0;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(major ? 26 : 14, sy);
      ctx.stroke();
      if (major) ctx.fillText(`${m}m`, 30, sy);
    }
    ctx.restore();

    // 背景纸屑（视差）
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (const b of this.ambientBits) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(-b.s / 2, -b.s, b.s, b.s * 2);
      ctx.restore();
    }
    ctx.restore();

    // 药水 → 词条 → 粒子 → 玩家 → 漂浮字
    for (const p of this.spawner.potions) if (p.active) drawPotion(ctx, p);
    for (const hl of this.spawner.headlines) if (hl.active) drawHeadline(ctx, hl);

    ctx.save();
    ctx.globalAlpha = 0.95;
    if (this.state === 'dying') {
      // 死亡翻滚
      ctx.translate(this.player.x, this.player.y);
      ctx.rotate(this.tumble);
      ctx.translate(-this.player.x, -this.player.y);
    }
    this.player.draw(ctx);
    ctx.restore();

    this.particles.draw(ctx);
    this.floats.draw(ctx, SERIF_FONT);

    ctx.restore();
    void alpha; // 固定步长已足够平滑，插值保留参数位
  }
}

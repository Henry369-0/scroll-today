/** 启动 + 场景机切换（menu / play / pause / gameover） */
import './style.css';
import { GameLoop } from './core/loop';
import { Input } from './core/input';
import { sfx } from './audio/sfx';
import { Hud } from './ui/hud';
import { addScore, loadTop10, renderBoard, ScoreEntry } from './ui/leaderboard';
import { buildCard, exportCard, renderCardPng, CardData } from './ui/share-card';
import { Ambient } from './scenes/ambient';
import { PlayScene, RunResult } from './scenes/play';
import { buildRunItems, GameMode } from './data/daily';
import { LS_SETTINGS } from './config';

interface Settings { sound: boolean; juice: boolean; hotlist: boolean }

function loadSettings(): Settings {
  const def: Settings = { sound: true, juice: true, hotlist: false };
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    return raw ? { ...def, ...(JSON.parse(raw) as Partial<Settings>) } : def;
  } catch {
    return def;
  }
}

function saveSettings(s: Settings): void {
  try { localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); } catch { /* ignore */ }
}

// ---------- DOM ----------
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const menuEl = document.getElementById('menu')!;
const pauseEl = document.getElementById('pause')!;
const overEl = document.getElementById('gameover')!;
const cardPreview = document.getElementById('card-preview')!;
const overRank = document.getElementById('over-rank')!;
const boardMenu = document.getElementById('board-menu')!;
const boardOver = document.getElementById('board-over')!;
const optSound = document.getElementById('opt-sound') as HTMLInputElement;
const optJuice = document.getElementById('opt-juice') as HTMLInputElement;
const optHotlist = document.getElementById('opt-hotlist') as HTMLInputElement;
const btnSaveCard = document.getElementById('btn-save-card') as HTMLButtonElement;

// ---------- 全局状态 ----------
const settings = loadSettings();
sfx.enabled = settings.sound;
let scene: 'menu' | 'play' | 'gameover' = 'menu';
let lastMode: GameMode = 'normal';
let currentResult: RunResult | null = null;

let W = window.innerWidth;
let H = window.innerHeight;

function resize(): void {
  W = window.innerWidth;
  H = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ambient.resize(W, H);
  if (play) play.resize(W, H);
}

// ---------- 模块 ----------
const input = new Input(canvas);
const hud = new Hud();
const ambient = new Ambient(ctx);
let play: PlayScene | null = null;

const loopCtl = { hitStop: 0, timeScale: 1 };
const loop = new GameLoop(
  (dt, rawDt) => {
    if (scene === 'play' && play) play.update(dt, rawDt);
    else ambient.update(dt);
  },
  () => {
    if (scene === 'play' && play) play.render(1);
    else ambient.render();
  },
);

// ---------- 覆盖层切换 ----------
function showOverlay(which: 'menu' | 'pause' | 'gameover' | null): void {
  menuEl.classList.toggle('hidden', which !== 'menu');
  pauseEl.classList.toggle('hidden', which !== 'pause');
  overEl.classList.toggle('hidden', which !== 'gameover');
}

function toMenu(): void {
  scene = 'menu';
  play = null;
  hud.hide();
  loop.paused = false;
  loopCtl.timeScale = 1;
  showOverlay('menu');
  renderBoard(boardMenu);
}

function goHome(): void {
  sfx.ui();
  toMenu();
}

// ---------- 开局 ----------
let starting = false;
async function startRun(mode: GameMode): Promise<void> {
  if (starting) return;
  starting = true;
  sfx.unlock();
  sfx.ui();
  lastMode = mode;
  // 语料准备：热榜开启时可能等待网络，最迟 3s 回落内置
  const items = await buildRunItems(settings.hotlist);
  play = new PlayScene(ctx, input, hud, settings, onDeath, loopCtl);
  play.enter(mode, items, W, H);
  scene = 'play';
  loop.paused = false;
  showOverlay(null);
  starting = false;
}

// ---------- 死亡结算 ----------
function onDeath(r: RunResult): void {
  scene = 'gameover';
  play = null;
  loopCtl.timeScale = 1;
  loopCtl.hitStop = 0;
  hud.hide();
  currentResult = r;

  const entry: ScoreEntry = {
    score: r.score, meters: r.meters, sec: r.sec, potions: r.potions,
    nearMiss: r.nearMiss, headline: r.headline, mode: r.mode,
    date: new Date().toISOString().slice(0, 10),
  };
  const rank = addScore(entry);

  // 成绩卡预览
  const cardData: CardData = { ...r };
  const card = buildCard(cardData);
  cardPreview.innerHTML = '';
  renderCardPng(card)
    .then((url) => {
      cardPreview.innerHTML = `<img src="${url}" alt="号外成绩卡" />`;
    })
    .catch(() => {
      cardPreview.innerHTML = '<div style="padding:20px;font-size:13px">预览生成失败，可点击下方按钮重试</div>';
    });
  (window as unknown as { __card?: HTMLElement }).__card = card;

  overRank.classList.toggle('hidden', rank === 0);
  if (rank > 0) overRank.textContent = rank === 1 ? '新纪录 · 本地第 1 名！' : `挤进本地 Top10 · 第 ${rank} 名`;
  renderBoard(boardOver);

  showOverlay('gameover');
  loop.paused = false;
}

// ---------- 事件绑定 ----------
document.getElementById('btn-start')!.addEventListener('click', () => void startRun('normal'));
document.getElementById('btn-daily')!.addEventListener('click', () => void startRun('daily'));
document.getElementById('btn-retry')!.addEventListener('click', () => {
  overEl.classList.add('hidden');
  void startRun(lastMode);
});
document.getElementById('btn-home')!.addEventListener('click', goHome);
document.getElementById('btn-resume')!.addEventListener('click', () => togglePause(false));
document.getElementById('btn-pause')!.addEventListener('click', () => togglePause(true));

btnSaveCard.addEventListener('click', () => {
  const card = (window as unknown as { __card?: HTMLElement }).__card;
  if (!card) return;
  btnSaveCard.disabled = true;
  const label = btnSaveCard.textContent;
  btnSaveCard.textContent = '生成中…';
  exportCard(card)
    .catch(() => alert('成绩卡导出失败，请重试'))
    .finally(() => {
      btnSaveCard.disabled = false;
      btnSaveCard.textContent = label;
    });
});

function togglePause(on?: boolean): void {
  if (scene !== 'play') return;
  const next = on ?? !loop.paused;
  if (next === loop.paused) return;
  loop.paused = next;
  if (next) input.reset();
  pauseEl.classList.toggle('hidden', !next);
  sfx.ui();
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (e.repeat) return;
    if (scene === 'play') togglePause();
  }
});
window.addEventListener('blur', () => togglePause(true));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) togglePause(true);
});

// 设置项
function syncSettingsUI(): void {
  optSound.checked = settings.sound;
  optJuice.checked = settings.juice;
  optHotlist.checked = settings.hotlist;
}
optSound.addEventListener('change', () => {
  settings.sound = optSound.checked;
  sfx.enabled = settings.sound;
  saveSettings(settings);
});
optJuice.addEventListener('change', () => {
  settings.juice = optJuice.checked;
  saveSettings(settings);
});
optHotlist.addEventListener('change', () => {
  settings.hotlist = optHotlist.checked;
  saveSettings(settings);
});
syncSettingsUI();

// 任何首次交互解锁音频
window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
window.addEventListener('keydown', () => sfx.unlock(), { once: true });

window.addEventListener('resize', resize);
resize();
renderBoard(boardMenu);
showOverlay('menu');
loop.start();

// ---------- 自动测试钩子（#autotest，无头/节流环境冒烟测试，不影响正常游玩） ----------
interface AutoTestResult {
  stage: string;
  hitsTimeline: number[];
  firstHitFrame?: string;
  deathFrame?: string;
  result?: RunResult;
  rank?: number;
  boardItems?: string[];
  pauseOpen?: boolean;
  pauseClosed?: boolean;
  dailySeqA?: string[];
  dailySeqB?: string[];
  dailyDeterministic?: boolean;
  normalSequencesDiffer?: boolean;
  cardDataUrl?: string;
  errors: string[];
  // 阶段 B：near-miss / 药水 / juice 关闭
  juiceOffOk?: boolean;
  potionsEaten?: number;
  nearMissCount?: number;
  // 阶段 C：热榜回落（dev 无 /api 函数 → 应回落内置语料）
  hotlistFallbackLen?: number;
  // 阶段 D：榜单排序
  boardSorted?: boolean;
}

async function runAutoTest(): Promise<AutoTestResult> {
  const r: AutoTestResult = { stage: 'start', hitsTimeline: [], errors: [] };
  (window as unknown as { __autoTestResult?: AutoTestResult }).__autoTestResult = r;
  try {
    const toDataUrl = (): string => canvas.toDataURL('image/png');
    const lostCount = (): number => document.querySelectorAll('#hud-lives .pencil.lost').length;

    // —— 每日种子确定性：两次每日局生成序列应一致；随机局应不同 ——
    r.stage = 'determinism';
    const items = await buildRunItems(false);
    const collectSeq = (mode: 'daily' | 'normal', steps: number): string[] => {
      const seq: string[] = [];
      const p = new PlayScene(ctx, input, hud, settings, () => {}, loopCtl);
      p.enter(mode, items, W, H);
      const inner = p as unknown as {
        spawner: { headlines: { active: boolean; text: string }[] };
        player: { invincible: number };
      };
      const read = (): string[] => inner.spawner.headlines.map((h) => (h.active ? h.text : ''));
      let prev = read();
      for (let i = 0; i < steps && !p.isDying; i++) {
        inner.player.invincible = 999; // 收集阶段不受击（受击会中断生成序列）
        if (i % 30 === 0) input.boost = Math.min(1, input.boost + 0.3);
        p.update(1 / 60, 1 / 60);
        loopCtl.hitStop = Math.max(0, loopCtl.hitStop - 1 / 60);
        const cur = read();
        for (let k = 0; k < cur.length; k++) {
          if (cur[k] && cur[k] !== prev[k]) seq.push(cur[k]);
        }
        prev = cur;
      }
      return seq;
    };
    r.dailySeqA = collectSeq('daily', 3000);
    r.dailySeqB = collectSeq('daily', 3000);
    r.dailyDeterministic = r.dailySeqA.length > 5 && JSON.stringify(r.dailySeqA) === JSON.stringify(r.dailySeqB);
    const normalSeq = collectSeq('normal', 1500);
    r.normalSequencesDiffer = JSON.stringify(normalSeq) !== JSON.stringify(r.dailySeqA);

    // —— 完整一局：追踪最近词条撞上去，验证受击/juice/死亡/结算 ——
    r.stage = 'play';
    const p = new PlayScene(ctx, input, hud, settings, onDeath, loopCtl);
    p.enter('normal', items, W, H);
    const spawnerOf = () =>
      (p as unknown as { spawner: { headlines: { active: boolean; x: number; y: number; text: string }[] } }).spawner;
    let firstHitCaptured = false;
    let deathCaptured = false;
    let prevLost = 0;
    // 跑到真实 onDeath 完成（currentResult 被 main 的结算流程填充）
    for (let i = 0; i < 60 * 240 && !currentResult; i++) {
      if (i % 20 === 0) {
        input.boost = Math.min(1, input.boost + 0.3);
        // 追踪最近的下方词条，主动撞上去
        const hs = spawnerOf().headlines.filter((h) => h.active && h.y > 0 && h.y < H);
        if (hs.length > 0) {
          const target = hs.reduce((a, b) => (Math.abs(b.x - 640) < Math.abs(a.x - 640) ? b : a));
          input.pointerX = target.x;
        }
      }
      p.update(1 / 60, 1 / 60);
      loopCtl.hitStop = Math.max(0, loopCtl.hitStop - 1 / 60);
      const lost = lostCount();
      if (lost > prevLost) {
        r.hitsTimeline.push(i / 60);
        if (!firstHitCaptured) {
          p.render(1);
          r.firstHitFrame = toDataUrl();
          firstHitCaptured = true;
        }
        prevLost = lost;
      }
      if (p.isDying && !deathCaptured) {
        p.render(1);
        r.deathFrame = toDataUrl();
        deathCaptured = true;
      }
    }

    r.stage = 'settle';
    // 等待真实 onDeath 完成结算（成绩卡预览为异步 toPng）
    for (let i = 0; i < 40 && !currentResult; i++) await new Promise((res) => setTimeout(res, 250));
    r.result = currentResult ?? undefined;
    r.rank = overRank.classList.contains('hidden') ? 0 : Number((overRank.textContent ?? '').replace(/\D/g, '')) || 1;
    r.boardItems = Array.from(boardOver.querySelectorAll('li')).map((li) => li.textContent ?? '');

    // —— 暂停开关 ——
    r.stage = 'pause';
    await startRunQuiet('daily');
    togglePause(true);
    r.pauseOpen = !pauseEl.classList.contains('hidden');
    togglePause(false);
    r.pauseClosed = pauseEl.classList.contains('hidden');

    // —— 成绩卡 PNG ——
    r.stage = 'card';
    const card = (window as unknown as { __card?: HTMLElement }).__card;
    if (card) {
      r.cardDataUrl = await renderCardPng(card);
    }

    // —— 阶段 B：juice 关闭 + near-miss 擦身 + 药水拾取 ——
    r.stage = 'juice-off';
    settings.juice = false;
    {
      const p2 = new PlayScene(ctx, input, hud, settings, () => {}, loopCtl);
      p2.enter('normal', items, W, H);
      const inner2 = p2 as unknown as {
        spawner: { headlines: { active: boolean; x: number; y: number; w: number; h: number; text: string }[]; potions: { active: boolean; x: number; y: number }[] };
        score: { potions: number; nearMiss: number };
        player: { invincible: number };
      };
      const pot0 = inner2.score.potions;
      const nm0 = inner2.score.nearMiss;
      let crashed = false;
      for (let i = 0; i < 60 * 75 && !p2.isDying; i++) {
        inner2.player.invincible = 999; // 永不受击；near-miss 与药水拾取不受无敌影响
        if (i % 10 === 0) {
          input.boost = Math.min(1, input.boost + 0.25);
          const potion = inner2.spawner.potions.find((q) => q.active && q.y > 40 && q.y < H - 40);
          if (potion) {
            input.pointerX = potion.x;
          } else {
            const hs = inner2.spawner.headlines.filter((h) => h.active && h.y > H * 0.55 && h.y < H);
            if (hs.length > 0) {
              // 贴边擦身：玩家盒边缘与词条盒边缘保持 ~30px 缝隙
              const target = hs[0];
              input.pointerX = target.x + (target.w * 0.92) / 2 + 12 + 30;
            }
          }
        }
        try {
          p2.update(1 / 60, 1 / 60);
        } catch (e) {
          crashed = true;
          r.errors.push('juice-off update threw: ' + String(e));
          break;
        }
        loopCtl.hitStop = Math.max(0, loopCtl.hitStop - 1 / 60);
      }
      r.juiceOffOk = !crashed && loopCtl.hitStop === 0;
      r.potionsEaten = inner2.score.potions - pot0;
      r.nearMissCount = inner2.score.nearMiss - nm0;
    }
    settings.juice = true;

    // —— 阶段 C：热榜回落（dev 环境无 /api/hotlist → 应回落内置语料） ——
    r.stage = 'hotlist';
    const fallbackItems = await buildRunItems(true);
    r.hotlistFallbackLen = fallbackItems.length;

    // —— 阶段 D：榜单排序正确性 ——
    r.stage = 'board-sort';
    const raw = localStorage.getItem('scroll.today.top10');
    if (raw) {
      const arr = JSON.parse(raw) as { score: number }[];
      r.boardSorted = arr.every((e, i) => i === 0 || arr[i - 1].score >= e.score);
    } else {
      r.boardSorted = false;
    }

    r.stage = 'done';
  } catch (e) {
    r.errors.push(String(e instanceof Error ? e.stack ?? e.message : e));
  }
  return r;
}

// main.ts 内部：不弹起手的静默开局（autotest 用）
async function startRunQuiet(mode: GameMode): Promise<void> {
  const items = await buildRunItems(false);
  play = new PlayScene(ctx, input, hud, settings, onDeath, loopCtl);
  play.enter(mode, items, W, H);
  scene = 'play';
  showOverlay(null);
}

if (location.hash.includes('autotest')) {
  const holder = window as unknown as { __autoTest?: Promise<AutoTestResult> };
  holder.__autoTest = runAutoTest();
}

/**
 * 每日种子 + 热榜拉取与回落（开发文档 §2.2 三层语料）。
 * 安全第一：真实热榜是默认关闭的实验功能；拉到的词先过黑名单/白名单启发式，
 * 不足 50 条自动补内置语料。
 */
import { HEADLINES } from './headlines';
import { Rng, dailySeed, hashSeed } from '../core/rng';

export type HeadlineSource = 'builtin' | 'hotlist';
export type GameMode = 'normal' | 'daily';

export interface RunSeed {
  mode: GameMode;
  seed: number;
  source: HeadlineSource;
  items: string[];
}

/** 黑名单：命中即丢弃（真实热榜名誉/合规防线，仅启发式、宁枉勿纵） */
const BLOCKLIST = [
  '死', '杀', '尸', '坟', '葬', '枪', '毒', '赌', '监狱', '强奸', '性', '裸',
  '习', '主席', '政府', '国家领', '台独', '藏独', '疆独', '港独', '战争', '核',
  '疫情', '确诊', '疫苗受害', '癌', '自杀', '坠', '爆炸', '火灾遇难', '地震',
  '总统', '王室', '葬礼', '讣告', '被告', '嫌疑人', '受害者', '辱',
];

/** 白名单启发式：只留科技/生活/梗类倾向的词（命中任一关键词才保留） */
const WHITELIST_HINTS = [
  'AI', 'ai', '智能', 'App', 'APP', 'app', '网', '手机', '数码', '游戏', '电竞', '直播',
  '热搜', '网友', 'emoji', '表情', '梗', '吐槽', '搞笑', '神评', '段子',
  '吃', '喝', '奶茶', '咖啡', '美食', '外卖', '店', '菜', '妈', '爸', '猫', '狗', '宠物',
  '假', '萌', '甜', '懒', '宅', '班', '工', '学', '考', '假', '睡', '梦', '春节', '节日',
  '假', '周末', '假期', '电影', '剧', '综艺', '歌', '演唱会', '门票', '旅行', '景区',
];

const FETCH_TIMEOUT = 3000;

/** 拉公开热榜聚合 → 过滤 → 不足 50 补内置。任何异常都回落内置语料。 */
export async function buildRunItems(useHotlist: boolean): Promise<string[]> {
  if (!useHotlist) return [...HEADLINES];
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
    const res = await fetch('/api/hotlist', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`hotlist ${res.status}`);
    const data = (await res.json()) as { ok?: boolean; items?: unknown };
    if (!data.ok || !Array.isArray(data.items)) throw new Error('bad payload');

    const filtered = data.items
      .map((x) => String(x).trim())
      .filter((s) => s.length >= 4 && s.length <= 24)
      .filter((s) => !BLOCKLIST.some((w) => s.includes(w)))
      .filter((s) => WHITELIST_HINTS.some((w) => s.includes(w)))
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .slice(0, 120);

    // 不足 50 条 → 自动补内置语料
    if (filtered.length < 50) {
      const merged = [...filtered, ...HEADLINES];
      return dedupe(merged);
    }
    return filtered;
  } catch {
    return [...HEADLINES]; // 断网 / 接口挂 / 无函数部署 → 回落
  }
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}

/** 生成一局的随机源：每日/普通共用确定性种子（词条序列当天一致） */
export function makeRng(mode: GameMode): Rng {
  const d = dailySeed();
  return mode === 'daily' ? new Rng(d * 7919) : new Rng(hashSeed(`run-${Date.now()}-${Math.random()}`));
}

export function seedLabel(mode: GameMode): string {
  return mode === 'daily' ? String(dailySeed()) : 'RANDOM';
}

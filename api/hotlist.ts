/**
 * /api/hotlist —— 热榜聚合代理（Vercel Function，部署即用）。
 * 职责：解决 CORS + 1h 缓存 + 3s 超时不阻塞；只做透传，过滤在客户端 daily.ts。
 * 本地 dev 没有这个函数：前端 3s 超时后自动回落内置语料（v1 体验不受影响）。
 */

const UPSTREAM = 'https://api.pearktrue.cn/api/dailyhot/?title=微博';

interface UpstreamItem { title?: string; word?: string; name?: string }

export default async function handler(_req: unknown, res: {
  setHeader(k: string, v: string): void;
  status(code: number): { json(b: unknown): void };
}): Promise<void> {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  try {
    const r = await fetch(UPSTREAM, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) throw new Error(String(r.status));
    const data = (await r.json()) as UpstreamItem[] | { data?: UpstreamItem[] };
    const list = Array.isArray(data) ? data : (data.data ?? []);
    const items = list
      .map((x) => String(x?.title ?? x?.word ?? x?.name ?? '').trim())
      .filter(Boolean);
    res.status(200).json({ ok: true, items, fetchedAt: Date.now() });
  } catch {
    // 上游挂了也返回 200，让客户端缓存生效并回落
    res.status(200).json({ ok: false, items: [] });
  }
}

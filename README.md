# 热搜求生 · scroll.today

> 唯一操作是滚动的生存小游戏——刷得越快，热搜扑得越猛。系列第四件（layers / focus / digest / scroll.today）。
> 致敬重写：灵感来源 [Ironic Sans《Doomscrolling: The Game》](https://ironicsans.ghost.io/doomscrolling-the-game/)（P0 侦察结论见 `RECON_NOTES.md`）。

## 玩法

- **滚轮 ↓** = 刷得更快（下行加速、得分更快、词条来袭更猛）；**滚轮 ↑** = 刹车
- **鼠标 X**（或 ←→ / A D）左右躲闪；移动端**向下拖 = 刷，左右拖 = 躲**
- 热搜词条 = 泛黄报纸剪报块，从屏幕下方涌上来；撞上扣 1 命（共 3 命，受击 1.5s 无敌）
- 「冷静药水」回 1 命；擦身而过 +50「好险」；每 250m 一个里程碑
- 死亡结算「号外！」成绩卡（1080×1440 PNG，可保存转发），本地 Top10

## 开发

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # 产物 dist/
```

- 技术：Vite + TypeScript + 原生 Canvas 2D；固定步长循环（1/60s 累积器）；对象池；mulberry32 种子随机
- juice（粒子/震屏/hit stop/慢动作/合成音效）可在菜单一键关闭，对比一眼可见
- 词库 100% 自造（`src/data/headlines.ts`，≥200 条），不含真实人名与真实事件

## 每日挑战与热榜

- **每日挑战**：种子 = `YYYYMMDD`，同一天所有人词条序列一致，本地榜可比
- **实验性真实热榜**（默认关）：菜单勾选后经 `/api/hotlist` 拉取 → 黑名单/白名单启发式过滤 → 不足 50 条自动补内置语料；断网/接口挂 3s 超时回落

### 部署（Vercel 示例）

仓库直接 Import，`api/hotlist.ts` 自动成为 Serverless Function，前端走 `/api/hotlist`；缓存 `s-maxage=3600`（二次请求 <100ms）。纯静态托管（如 GitHub Pages）也能玩：热榜开关会自动回落内置语料，其余功能完整。

## 结构

```
api/hotlist.ts        # serverless：拉热榜 + 1h 缓存
src/
├── main.ts           # 启动 + 场景机切换
├── core/             # loop / input / rng
├── entities/         # player / headline / potion / particles
├── systems/          # spawn / collide / difficulty / score
├── scenes/           # menu+gameover(ambient) / play
├── data/             # headlines(≥200 自造) / daily(种子+回落)
├── ui/               # hud / share-card / leaderboard
└── audio/sfx.ts      # Web Audio 合成四件套
```

## v2 路线（按价值排序）

1. 每日排行榜（成绩卡二维码 → 当日榜，好友对战闭环）
2. 「关机」大招：药水能量清屏 3 秒
3. 皮肤系统 / chiptune BGM / itch.io 上架（页面文案 + 试玩 GIF）
4. 连 #03 的 LLM 端点，让模型现编词条

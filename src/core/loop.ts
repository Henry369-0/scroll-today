/**
 * 固定步长游戏循环（1/60s 累积器）+ 渲染插值。
 * 支持 timeScale（死亡慢动作）、hitStop（撞击冻结，冻结期仍渲染）。
 */
export class GameLoop {
  timeScale = 1;
  hitStop = 0;
  paused = false;
  private acc = 0;
  private last = 0;
  private raf = 0;
  private running = false;

  constructor(
    private update: (dt: number, rawDt: number) => void,
    private render: (alpha: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame = (t: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);

    const rawDt = Math.min((t - this.last) / 1000, 0.1);
    this.last = t;
    if (this.paused) return;

    // hit stop：撞击瞬间冻结模拟，画面保持
    if (this.hitStop > 0) {
      this.hitStop -= rawDt;
      this.render(1);
      return;
    }

    const dt = rawDt * this.timeScale;
    this.acc += dt;
    const step = 1 / 60;
    let n = 0;
    while (this.acc >= step && n < 5) {
      this.update(step, rawDt);
      this.acc -= step;
      n++;
    }
    if (n === 5) this.acc = 0; // 长卡顿丢弃积压，避免螺旋追帧
    this.render(this.acc / step);
  };
}

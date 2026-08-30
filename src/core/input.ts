/**
 * 输入归一化：wheel / touch / 键盘 → 同一套"刷力 + 横移"模型。
 * 坑（开发文档 §3 提前定死）：
 *  - wheel 必须 passive:false 才能 preventDefault（canvas 全屏吞滚轮，阻止页面真滚动）
 *  - deltaMode 按行/按页归一化为像素，再按小步进累积，兼容不同鼠标灵敏度
 *  - 触摸设备没有滚轮：向下拖 = 刷，左右拖 = 躲
 */

/** 不同设备每格滚轮的像素当量差异较大，用小步进累积到 [0,1] */
const WHEEL_STEP = 420;      // 累计滚动 420px 满格刷力
const WHEEL_BRAKE = 240;     // 反向刹车更灵敏
const WHEEL_EVENT_CLAMP = 90; // 单次事件最多计入的像素（防高端鼠标一格爆表）
const TOUCH_STEP = 260;      // 向下拖 260px 满格
const DECAY_TAU = 1.1;       // 不刷时刷力自然回落的时间常数 s

export class Input {
  /** 刷力 0..1：滚轮↓累积、滚轮↑刹车、闲置自然衰减 */
  boost = 0;
  /** 鼠标/触摸提供的横移目标 X（CSS px，canvas 坐标） */
  pointerX: number | null = null;
  /** 键盘横移 -1/0/1（备选 ←→ / A D） */
  keyX = 0;
  /** 键盘长按加刷（↓ / 空格） */
  keyBoost = 0;

  private el: HTMLElement;
  private touchLast: { x: number; y: number } | null = null;

  constructor(el: HTMLElement) {
    this.el = el;
    this.bind();
  }

  private bind(): void {
    // wheel/touch 绑在 canvas 上：菜单等 DOM 覆盖层打开时不拦截其自身滚动
    this.el.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    document.addEventListener('mouseleave', this.onMouseLeave);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.el.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.el.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.el.addEventListener('touchend', this.onTouchEnd);
  }

  dispose(): void {
    this.el.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseleave', this.onMouseLeave);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.el.removeEventListener('touchstart', this.onTouchStart);
    this.el.removeEventListener('touchmove', this.onTouchMove);
    this.el.removeEventListener('touchend', this.onTouchEnd);
  }

  /** deltaMode: 0=像素 1=行 2=页 → 统一像素 */
  private normalizeDelta(e: WheelEvent): number {
    const d = e.deltaY;
    const mode = e.deltaMode;
    if (mode === 1) return d * 16;
    if (mode === 2) return d * 100;
    return d;
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const d = this.normalizeDelta(e);
    const clamped = Math.max(-WHEEL_EVENT_CLAMP, Math.min(WHEEL_EVENT_CLAMP, d));
    if (clamped > 0) {
      this.boost = Math.min(1, this.boost + clamped / WHEEL_STEP);
    } else {
      this.boost = Math.max(0, this.boost + clamped / WHEEL_BRAKE);
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.el.getBoundingClientRect();
    this.pointerX = e.clientX - rect.left;
  };

  private onMouseLeave = (): void => {
    this.pointerX = null;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': this.keyX = -1; break;
      case 'ArrowRight': case 'KeyD': this.keyX = 1; break;
      case 'ArrowDown': case 'Space': this.keyBoost = 1; break;
      case 'ArrowUp': this.keyBoost = -1; break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA':
        if (this.keyX === -1) this.keyX = 0;
        break;
      case 'ArrowRight': case 'KeyD':
        if (this.keyX === 1) this.keyX = 0;
        break;
      case 'ArrowDown': case 'Space':
        if (this.keyBoost === 1) this.keyBoost = 0;
        break;
      case 'ArrowUp':
        if (this.keyBoost === -1) this.keyBoost = 0;
        break;
    }
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const t = e.touches[0];
    this.touchLast = { x: t.clientX, y: t.clientY };
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.touchLast) return;
    const t = e.touches[0];
    const dx = t.clientX - this.touchLast.x;
    const dy = t.clientY - this.touchLast.y;
    this.touchLast = { x: t.clientX, y: t.clientY };

    // 向下拖 = 刷，向上拖 = 刹（同一套速度模型）
    if (dy > 0) this.boost = Math.min(1, this.boost + dy / TOUCH_STEP);
    else this.boost = Math.max(0, this.boost + dy / WHEEL_BRAKE);

    // 左右拖 = 躲
    if (dx !== 0 && this.pointerX !== null) {
      this.pointerX += dx;
    } else if (dx !== 0) {
      const rect = this.el.getBoundingClientRect();
      this.pointerX = t.clientX - rect.left;
    }
  };

  private onTouchEnd = (): void => {
    this.touchLast = null;
  };

  /** 每帧调用：刷力自然回落 + 键盘加刷 */
  update(dt: number): void {
    if (this.keyBoost === 1) this.boost = Math.min(1, this.boost + dt * 0.9);
    else if (this.keyBoost === -1) this.boost = Math.max(0, this.boost - dt * 1.6);
    if (this.keyBoost === 0) {
      // 指数衰减：不刷时速度回落到基础值
      this.boost *= Math.exp(-dt / DECAY_TAU);
      if (this.boost < 0.004) this.boost = 0;
    }
  }

  reset(): void {
    this.boost = 0;
    this.keyX = 0;
    this.keyBoost = 0;
  }
}

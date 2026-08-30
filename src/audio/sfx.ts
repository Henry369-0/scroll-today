/** 音效全 Web Audio 合成（零音频文件）：受击/拾取/里程碑/死亡四件套 + near-miss/UI */
export class Sfx {
  private ctx: AudioContext | null = null;
  enabled = true;

  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private noiseBuffer(dur: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private tone(
    type: OscillatorType, f0: number, f1: number, dur: number,
    gain = 0.16, delay = 0,
  ): void {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, freq: number, gain = 0.2): void {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start(t);
  }

  /** 受击：纸裂 + 低闷响 */
  hit(): void {
    this.noise(0.16, 900, 0.3);
    this.tone('triangle', 170, 55, 0.22, 0.24);
  }

  /** 拾取：上行双音 */
  pickup(): void {
    this.tone('sine', 520, 540, 0.09, 0.16);
    this.tone('sine', 780, 820, 0.14, 0.16, 0.08);
  }

  /** 里程碑：小号式双音 */
  milestone(): void {
    this.tone('square', 660, 660, 0.09, 0.07);
    this.tone('square', 990, 990, 0.16, 0.07, 0.1);
  }

  /** near-miss：清脆一tick */
  near(): void {
    this.tone('sine', 1250, 1500, 0.06, 0.09);
  }

  /** 死亡：下行锯齿 + 纸片乱飞 */
  death(): void {
    this.tone('sawtooth', 300, 42, 0.75, 0.22);
    this.noise(0.5, 500, 0.3);
  }

  /** UI 点击 */
  ui(): void {
    this.tone('sine', 300, 260, 0.06, 0.08);
  }
}

export const sfx = new Sfx();

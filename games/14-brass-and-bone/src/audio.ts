import type { ResonanceSignature } from './types';

export class BrassBoneAudio {
  private ctx: AudioContext | null = null;
  private rainGain: GainNode | null = null;
  private isMuted = false;
  private lastCreakTime = 0;
  private lastTickTime = 0;

  private ensureContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
        this.startAmbientRain(this.ctx);
      } catch {
        return null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  private createPinkNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  private startAmbientRain(ctx: AudioContext): void {
    try {
      const buffer = this.createPinkNoiseBuffer(ctx, 3.0);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 620;
      filter.Q.value = 0.65;

      const gain = ctx.createGain();
      gain.gain.value = 0.032;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      this.rainGain = gain;
    } catch {
      // Ignore in headless environments
    }
  }

  /**
   * Heavy Stamp Slam: Low-pass filtered noise burst + 65Hz sub-thud
   */
  public playStampSlam(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      // 65Hz Sub-thud
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(65, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.22);
      subGain.gain.setValueAtTime(0.55, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.25);

      // Low-pass filtered noise burst
      const noiseBuf = this.createPinkNoiseBuffer(ctx, 0.16);
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(480, now);
      lp.frequency.exponentialRampToValueAtTime(110, now + 0.14);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.45, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noiseSrc.connect(lp);
      lp.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSrc.start(now);
      noiseSrc.stop(now + 0.16);
    } catch {}
  }

  /**
   * Brass Weight Clink: High-Q bandpass metallic ping at 1480Hz + 2210Hz
   */
  public playBrassWeightClink(weightGrams = 50): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const pitchShift = weightGrams >= 100 ? 0.92 : weightGrams <= 10 ? 1.12 : 1.0;
      const freqs = [1480 * pitchShift, 2210 * pitchShift];

      for (const f of freqs) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now);

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(f, now);
        bp.Q.setValueAtTime(18, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(bp);
        bp.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.24);
      }
    } catch {}
  }

  /**
   * Scale Creak & Settle: Pitch-modulated triangle tick proportional to angular velocity
   */
  public playScaleCreak(angularVelocity: number): void {
    const speed = Math.abs(angularVelocity);
    if (speed < 0.18) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const minInterval = Math.max(0.045, 0.16 - speed * 0.04);
    if (now - this.lastCreakTime < minInterval) return;
    this.lastCreakTime = now;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = 240 + Math.min(360, speed * 140);
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, now + 0.035);

      gain.gain.setValueAtTime(Math.min(0.09, speed * 0.03), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    } catch {}
  }

  /**
   * Parchment Slide & Page Flip: Short shaped pink-noise envelope
   */
  public playParchmentSlide(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const buf = this.createPinkNoiseBuffer(ctx, 0.14);
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1350, now);
      bp.frequency.exponentialRampToValueAtTime(850, now + 0.13);
      bp.Q.value = 1.8;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.005, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      src.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.14);
    } catch {}
  }

  /**
   * Ink Pad Squelch: Wet low-mid resonant pink noise + soft thump
   */
  public playInkPadSquelch(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const buf = this.createPinkNoiseBuffer(ctx, 0.11);
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(420, now);
      bp.frequency.exponentialRampToValueAtTime(980, now + 0.09);
      bp.Q.value = 3.5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      src.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.11);
    } catch {}
  }

  /**
   * Acoustic Stethoscope / Tuning Fork material resonance
   */
  public playTuningForkResonance(sig: ResonanceSignature): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      if (sig === 'pure_gold') {
        // Warm, pure sustained harmonic chime (880Hz + 1320Hz)
        const freqs = [880, 1320, 1760];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.16 / (idx + 1), now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.88);
        });
      } else if (sig === 'hollow_lead') {
        // Dead, dull 95Hz thud that dies rapidly
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(105, now);
        osc.frequency.exponentialRampToValueAtTime(52, now + 0.16);
        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
      } else if (sig === 'ticking_bomb') {
        // Rapid sinister clockwork ticks + spring whine
        for (let i = 0; i < 6; i++) {
          const t = now + i * 0.085;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(i % 2 === 0 ? 1920 : 1540, t);
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.035);
        }
      } else if (sig === 'brass_hum') {
        // Warm 440Hz + 660Hz resonant brass hum
        for (const f of [440, 660]) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.68);
        }
      } else if (sig === 'silver_chime') {
        // High crystalline 1175Hz + 2350Hz chime
        for (const f of [1175, 2350]) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.78);
        }
      } else if (sig === 'whisper_curse') {
        // Dissonant warbling occult chord
        for (const f of [311, 330, 466]) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now);
          osc.frequency.linearRampToValueAtTime(f * 0.94, now + 0.55);
          gain.gain.setValueAtTime(0.07, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.6);
        }
      } else {
        this.playParchmentSlide();
      }
    } catch {}
  }

  /**
   * 1Hz Escapement Clock Tick that speeds up when the claimant loses patience
   */
  public updateClockTick(patienceRatio: number): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.isMuted) return;
    const now = ctx.currentTime;
    const interval = patienceRatio < 0.3 ? 0.35 : patienceRatio < 0.6 ? 0.65 : 1.0;
    if (now - this.lastTickTime < interval) return;
    this.lastTickTime = now;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(patienceRatio < 0.3 ? 1320 : 980, now);
      gain.gain.setValueAtTime(patienceRatio < 0.3 ? 0.045 : 0.022, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.022);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.025);
    } catch {}
  }

  public destroy(): void {
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
  }
}

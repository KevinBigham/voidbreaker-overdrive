// Procedural Foley WebAudio Engine for THE WEIGHT OF BRASS & BONE
// Synthesizes tactile, ASMR-grade 1890s appraiser desk sounds with zero external assets.

export type AcousticSignature =
  | 'gold_sine'
  | 'silver_ring'
  | 'lead_thud'
  | 'clockwork_steady'
  | 'clockwork_bomb'
  | 'cursed_whisper'
  | 'parchment_crisp';

export class BrassBoneAudioEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  private tickAccumulator = 0;
  private rainNoiseNode: AudioNode | null = null;
  private rainGainNode: GainNode | null = null;
  private scaleCreakCooldown = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.ensureRainLoop();
    return this.ctx;
  }

  private ensureRainLoop(): void {
    if (!this.ctx || this.rainNoiseNode) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.950 * b2 + white * 0.045;
        data[i] = (b0 + b1 + b2) * 0.35;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 620;
      filter.Q.value = 0.7;

      const gain = this.ctx.createGain();
      gain.gain.value = this.muted ? 0 : 0.035;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start();

      this.rainNoiseNode = source;
      this.rainGainNode = gain;
    } catch {
      // Ignore in headless test environments
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.rainGainNode && this.ctx) {
      this.rainGainNode.gain.setTargetAtTime(muted ? 0 : 0.035, this.ctx.currentTime, 0.05);
    }
  }

  // Heavy Stamp Slam: Low-pass filtered noise burst + 65Hz sub-thud
  public playStampSlam(isCertify: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      // 1. 65Hz Sub-Thud
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

      // 2. Low-pass filtered noise burst (mahogany impact)
      const noiseLen = Math.floor(ctx.sampleRate * 0.14);
      const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const output = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseLen * 0.28));
      }
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(420, now);
      lp.frequency.exponentialRampToValueAtTime(110, now + 0.13);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.42, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      noiseSrc.connect(lp);
      lp.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSrc.start(now);

      // 3. Iron collar overtone (distinct tone for Certify vs Confiscate)
      const ringOsc = ctx.createOscillator();
      const ringGain = ctx.createGain();
      ringOsc.type = 'triangle';
      ringOsc.frequency.setValueAtTime(isCertify ? 520 : 340, now);
      ringOsc.frequency.exponentialRampToValueAtTime(isCertify ? 660 : 210, now + 0.12);
      ringGain.gain.setValueAtTime(0.12, now);
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      ringOsc.connect(ringGain);
      ringGain.connect(ctx.destination);
      ringOsc.start(now);
      ringOsc.stop(now + 0.14);
    } catch {
      // Ignore audio errors
    }
  }

  // Brass Weight Clink: High-Q bandpass metallic ping at 1480Hz + 2210Hz
  public playWeightClink(grams = 50): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const pitchScale = Math.max(0.82, Math.min(1.18, 1.12 - grams * 0.002));
      const freqs = [1480 * pitchScale, 2210 * pitchScale];

      for (const freq of freqs) {
        const osc = ctx.createOscillator();
        const bp = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(freq, now);
        bp.Q.setValueAtTime(18, now);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.19);

        osc.connect(bp);
        bp.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch {
      // Ignore audio errors
    }
  }

  // Scale Creak & Settle: Pitch-modulated triangle tick proportional to angular velocity
  public playScaleCreak(angularVelocity: number): void {
    if (this.scaleCreakCooldown > 0) return;
    const speed = Math.abs(angularVelocity);
    if (speed < 0.15) return;

    const ctx = this.ensureContext();
    if (!ctx) return;
    this.scaleCreakCooldown = 0.065;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const baseFreq = 260 + Math.min(420, speed * 190);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq * 0.86, now + 0.045);

      const vol = Math.min(0.09, 0.02 + speed * 0.035);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
    } catch {
      // Ignore
    }
  }

  // Parchment Slide & Page Flip: Short shaped pink-noise envelope
  public playParchmentSlide(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * 0.11);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let prev = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        prev = 0.82 * prev + 0.18 * white;
        const env = Math.sin((i / len) * Math.PI);
        data[i] = prev * env * 0.6;
      }

      const src = ctx.createBufferSource();
      src.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1350, now);
      bp.Q.setValueAtTime(1.4, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      src.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
    } catch {
      // Ignore
    }
  }

  // Ink Pad Squelch: Wet resonant noise + low bubble pop
  public playInkPadSquelch(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.07);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.085);

      this.playParchmentSlide();
    } catch {
      // Ignore
    }
  }

  // Acoustic Stethoscope / Tuning Fork material resonance
  public playTuningForkStrike(signature: AcousticSignature): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      if (signature === 'gold_sine') {
        const freqs = [528, 1056, 1584];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.18 / (idx + 1), now);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.65);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.68);
        });
      } else if (signature === 'silver_ring') {
        const freqs = [880, 1760, 2640];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.16 / (idx + 1), now);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.75);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.78);
        });
      } else if (signature === 'lead_thud') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(118, now);
        osc.frequency.exponentialRampToValueAtTime(52, now + 0.09);
        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.11);
      } else if (signature === 'clockwork_steady') {
        for (let i = 0; i < 3; i++) {
          const t = now + i * 0.22;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(1650, t);
          gain.gain.setValueAtTime(0.09, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.03);
        }
      } else if (signature === 'clockwork_bomb') {
        for (let i = 0; i < 6; i++) {
          const t = now + i * 0.065;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(i % 2 === 0 ? 1920 : 1240, t);
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.035);
        }
      } else if (signature === 'cursed_whisper') {
        const freqs = [311.1, 329.6, 622.2];
        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now);
          osc.frequency.linearRampToValueAtTime(f * 0.97, now + 0.55);
          gain.gain.setValueAtTime(0.07, now);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.58);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.6);
        });
      } else {
        this.playParchmentSlide();
      }
    } catch {
      // Ignore
    }
  }

  public playDrawerFence(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.16);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);

      this.playWeightClink(20);
    } catch {
      // Ignore
    }
  }

  // Ambient Rain & 1Hz Escapement Clock Tick (speeds up when claimant loses patience)
  public stepAmbient(dtSec: number, patienceRatio: number): void {
    if (this.scaleCreakCooldown > 0) {
      this.scaleCreakCooldown = Math.max(0, this.scaleCreakCooldown - dtSec);
    }
    if (this.muted || !this.ctx) return;

    const tickRateHz = patienceRatio < 0.35 ? 2.6 : patienceRatio < 0.6 ? 1.5 : 1.0;
    this.tickAccumulator += dtSec * tickRateHz;
    if (this.tickAccumulator >= 1) {
      this.tickAccumulator -= 1;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(patienceRatio < 0.35 ? 1320 : 1080, now);
        gain.gain.setValueAtTime(0.022, now);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.018);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.02);
      } catch {
        // Ignore
      }
    }
  }
}

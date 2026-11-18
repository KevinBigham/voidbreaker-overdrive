// Lydian-Pentatonic hybrid intervals in semitones:
// 0 (Root), 2 (Maj 2nd), 4 (Maj 3rd), 6 (Aug 4th / Lydian #4), 7 (Perfect 5th), 9 (Maj 6th), 11 (Maj 7th)
export const LYDIAN_SEMITONES = [0, 2, 4, 6, 7, 9, 11] as const;

/**
 * Pure helper computing ascending harmonic pitch along a Lydian/pentatonic scale:
 * f = f0 * 2^(semitone / 12)
 */
export function computeHarmonicFrequency(activationIndex: number, baseFreq = 261.63): number {
  const clampedIndex = Math.max(0, Math.min(35, Math.floor(activationIndex)));
  const octave = Math.floor(clampedIndex / LYDIAN_SEMITONES.length);
  const degree = clampedIndex % LYDIAN_SEMITONES.length;
  const semitone = octave * 12 + LYDIAN_SEMITONES[degree];
  return Number((baseFreq * Math.pow(2, semitone / 12)).toFixed(4));
}

export class ClockworkSynth {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          this.ctx = null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(m: boolean): void {
    this.muted = m;
  }

  /** Crisp low-frequency mechanical "clack" when lifting a module */
  public playPickupClack(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(68, now + 0.055);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  /** Metallic ratchet detent click when rotating a part in 60° or 90° steps */
  public playRatchetClick(angleDeg = 0): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const pitchOffset = ((Math.abs(Math.round(angleDeg)) % 360) / 360) * 180;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(920 + pitchOffset, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.028);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1840 + pitchOffset, now);
    osc2.frequency.exponentialRampToValueAtTime(520, now + 0.022);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.035);
    osc2.stop(now + 0.035);
  }

  /** Seat thud + brass spark click when dropping a module into a socket */
  public playSocketSeat(neighborCount = 0): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Low brass seat thud
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(118, now);
    thud.frequency.exponentialRampToValueAtTime(46, now + 0.085);
    thudGain.gain.setValueAtTime(0.28, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(now);
    thud.stop(now + 0.095);

    // High metallic lock ping
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(640 + neighborCount * 110, now + 0.015);
    ping.frequency.exponentialRampToValueAtTime(980 + neighborCount * 140, now + 0.075);
    pingGain.gain.setValueAtTime(0.11, now + 0.015);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    ping.connect(pingGain);
    pingGain.connect(ctx.destination);
    ping.start(now + 0.015);
    ping.stop(now + 0.09);
  }

  /** Heavy spring thunk when pulling and releasing the Launch Lever */
  public playLeverThunk(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.16);

    sub.type = 'triangle';
    sub.frequency.setValueAtTime(88, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.19);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);

    osc.connect(gain);
    sub.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    sub.start(now);
    osc.stop(now + 0.22);
    sub.stop(now + 0.22);
  }

  /**
   * Harmonic marimba/celesta note + brass/glass clink on consecutive module activation
   */
  public playCascadeNote(activationIndex: number, tier: 'raw' | 'heated' | 'supercritical' = 'raw'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const freq = computeHarmonicFrequency(activationIndex, 261.63);

    // Primary celesta/marimba bell tone
    const bell = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gain = ctx.createGain();
    const overtoneGain = ctx.createGain();

    bell.type = 'sine';
    bell.frequency.setValueAtTime(freq, now);

    // Celesta/marimba 4th harmonic overtone + brass clink transient
    overtone.type = tier === 'supercritical' ? 'triangle' : 'sine';
    overtone.frequency.setValueAtTime(freq * (tier === 'raw' ? 2.0 : 3.0), now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    overtoneGain.gain.setValueAtTime(0.08, now);
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    bell.connect(gain);
    overtone.connect(overtoneGain);
    overtoneGain.connect(gain);
    gain.connect(ctx.destination);

    bell.start(now);
    overtone.start(now);
    bell.stop(now + 0.28);
    overtone.stop(now + 0.11);
  }

  /** Pneumatic steam vent + golden coin cascade chime on safe Overclock cash-out */
  public playPneumaticCashOut(potMultiplier = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // White noise pneumatic hiss
    const bufferSize = Math.floor(ctx.sampleRate * 0.22);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.Q.setValueAtTime(1.4, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);

    // Golden arpeggio chimes
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const count = Math.min(4, 2 + Math.floor(Math.log2(Math.max(1, potMultiplier))));
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t = now + i * 0.045;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[i % notes.length], t);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    }
  }

  /** Overclock recycle pump pulse */
  public playOverclockRecycle(mult: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    const base = 180 + Math.min(400, mult * 45);
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.75, now + 0.14);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /** Boiler gasket blowout shatter sound */
  public playGasketBlowout(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.34);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  }
}

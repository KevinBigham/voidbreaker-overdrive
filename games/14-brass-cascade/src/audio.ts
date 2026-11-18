// Procedural Clockwork + Harmonic Marimba/Synth WebAudio Engine

const HARMONIC_SCALE_HZ = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.00, // G4
  493.88, // B4
  587.33, // D5
  739.99, // F#5
  880.00, // A5
  987.77, // B5
  1174.66 // D6
];

export class BrassAudioEngine {
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
          return null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Subtle brass lift tick when hovering a piece or slot */
  public playHoverTick(velocityMag = 0.5): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = 190 + Math.min(120, velocityMag * 45);
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.028);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, now);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /** Crisp magnetic brass clack when snapping a piece into a slot */
  public playMagneticSnap(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Low heavy magnet thud
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(145, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(48, now + 0.065);
    bodyGain.gain.setValueAtTime(0.22, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.075);

    // 2. Crisp brass rim click (delayed 8ms for mechanical double-contact feel)
    const clickOsc = ctx.createOscillator();
    const clickFilter = ctx.createBiquadFilter();
    const clickGain = ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(1180, now + 0.008);
    clickOsc.frequency.exponentialRampToValueAtTime(340, now + 0.042);

    clickFilter.type = 'bandpass';
    clickFilter.frequency.setValueAtTime(1400, now + 0.008);
    clickFilter.Q.setValueAtTime(2.5, now + 0.008);

    clickGain.gain.setValueAtTime(0.14, now + 0.008);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    clickOsc.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now + 0.008);
    clickOsc.stop(now + 0.05);
  }

  /** Clockwork ratchet click when rotating orientation (R / Right-click) */
  public playRatchetRotate(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.022;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520 + i * 190, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.018);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, t);

      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.022);
    }
  }

  /** Mechanical spring-release sound when undoing a move */
  public playUndoRelease(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.09);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, now);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Harmonic marimba/synth note that steps up C4 -> D4 -> E4 -> G4 -> B4 -> D5 -> F#5
   * on each sequential beat in a chain reaction.
   */
  public playCascadeStepNote(stepIndex: number, isHeavyImpact = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const idx = Math.max(0, Math.min(HARMONIC_SCALE_HZ.length - 1, stepIndex - 1));
    const freq = HARMONIC_SCALE_HZ[idx];

    // Marimba woody fundamental + harmonic overtone
    const fund = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const gain = ctx.createGain();
    const overtoneGain = ctx.createGain();
    const subGain = ctx.createGain();

    fund.type = 'sine';
    fund.frequency.setValueAtTime(freq, now);

    // Marimba characteristic 4th harmonic
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 4, now);

    // Warm brass fifth / sub punch on impact
    sub.type = isHeavyImpact ? 'sawtooth' : 'sine';
    sub.frequency.setValueAtTime(freq * 0.5, now);
    if (isHeavyImpact) {
      sub.frequency.exponentialRampToValueAtTime(46, now + 0.14);
    }

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    overtoneGain.gain.setValueAtTime(0.06, now);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.075);

    subGain.gain.setValueAtTime(isHeavyImpact ? 0.16 : 0.07, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    fund.connect(gain);
    overtone.connect(overtoneGain);
    sub.connect(subGain);

    gain.connect(ctx.destination);
    overtoneGain.connect(ctx.destination);
    subGain.connect(ctx.destination);

    fund.start(now);
    overtone.start(now);
    sub.start(now);

    fund.stop(now + 0.36);
    overtone.stop(now + 0.08);
    sub.stop(now + 0.2);
  }

  /** Rich triumphant brass chord when clearing a stage or picking a relic */
  public playStageClearChord(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const chord = [261.63, 329.63, 392.00, 493.88, 587.33]; // Cmaj9
    const now = ctx.currentTime;
    chord.forEach((freq, i) => {
      const t = now + i * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.58);
    });
  }
}

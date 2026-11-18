/**
 * IRONBREAKER // DOMINO FOUNDRY — Procedural Web Audio Mechanical Foley & Harmonic Escalation
 * Synthesizes ratcheting aim clicks, pneumatic pistons, heavy metallic clangs, glass shatters,
 * slag explosions, and an ascending jazz-pentatonic chord progression that climbs in pitch
 * with every link in a single chain reaction.
 */

// 16-step ascending Jazz-Lydian / Pentatonic Seventh harmonic scale (in Hz)
export const CHAIN_HARMONIC_FREQUENCIES: readonly number[] = [
  261.63, // Step 1: C4
  293.66, // Step 2: D4
  329.63, // Step 3: E4
  392.00, // Step 4: G4
  440.00, // Step 5: A4
  493.88, // Step 6: B4 (Maj7 color)
  587.33, // Step 7: D5 (9th color)
  659.25, // Step 8: E5
  739.99, // Step 9: F#5 (Lydian #11 tension)
  783.99, // Step 10: G5
  880.00, // Step 11: A5
  987.77, // Step 12: B5
  1174.66, // Step 13: D6
  1318.51, // Step 14: E6
  1567.98, // Step 15: G6
  1760.00, // Step 16+: A6
];

export function getChainStepFrequency(chainStep: number): number {
  const index = Math.max(0, Math.min(CHAIN_HARMONIC_FREQUENCIES.length - 1, Math.floor(chainStep) - 1));
  return CHAIN_HARMONIC_FREQUENCIES[index];
}

export class FoundryAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor(initialMuted = false) {
    this.muted = initialMuted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

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
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Subtle mechanical brass ratchet click when changing hovered tile or tool aim.
   */
  public playAimRatchet(pitchOffset = 0): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const baseHz = 1150 + (pitchOffset % 6) * 95;
    osc.frequency.setValueAtTime(baseHz, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.028);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * Hydraulic pneumatic hiss + low iron punch when firing a tool.
   */
  public playKineticLaunch(toolKind: 'ram' | 'harpoon' | 'mortar' = 'ram'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Sub-bass piston thump
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = toolKind === 'harpoon' ? 'sawtooth' : 'sine';
    const startHz = toolKind === 'ram' ? 145 : toolKind === 'harpoon' ? 240 : 110;
    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.16);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);

    // 2. Pneumatic steam hiss burst
    this.playNoiseBurst(0.09, 1800, 0.11);
  }

  /**
   * Heavy FM metallic anvil clang on knockback collisions or wall slams.
   */
  public playMetallicClang(intensity = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const mainGain = ctx.createGain();

    const baseFreq = 280 + Math.min(4, intensity) * 45;
    carrier.type = 'triangle';
    carrier.frequency.setValueAtTime(baseFreq, now);
    carrier.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, now + 0.22);

    // Inharmonic ratio (1 : 1.414) for cast-iron bell/clang timbre
    modulator.type = 'square';
    modulator.frequency.setValueAtTime(baseFreq * 1.414, now);
    modGain.gain.setValueAtTime(baseFreq * 0.85, now);
    modGain.gain.exponentialRampToValueAtTime(8, now + 0.18);

    const vol = Math.min(0.28, 0.14 + intensity * 0.04);
    mainGain.gain.setValueAtTime(vol, now);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(mainGain);
    mainGain.connect(ctx.destination);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + 0.25);
    carrier.stop(now + 0.25);
  }

  /**
   * Crystalline high-frequency shatter for Cryo-Glass / Ice tiles or Ferro-Shields.
   */
  public playGlassShatter(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const shardFreqs = [2150, 2890, 3640, 4420];
    shardFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.018;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.65, t + 0.09);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.095);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    });
    this.playNoiseBurst(0.11, 3800, 0.1);
  }

  /**
   * Deep foundry detonation for Volatile Slag Barrels and Pillar collapses.
   */
  public playExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const sub = ctx.createOscillator();
    const gain = ctx.createGain();

    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(95, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + 0.32);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    sub.connect(gain);
    gain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.35);

    this.playNoiseBurst(0.26, 620, 0.22);
  }

  /**
   * Ascending harmonic chord progression that climbs in pitch with every link in a single chain reaction.
   * Returns the root frequency (Hz) played so headless tests can verify monotonic pitch escalation.
   */
  public playChainHarmonic(chainStep: number, isHazardKill = false): number {
    const rootHz = getChainStepFrequency(chainStep);
    const ctx = this.ensureContext();
    if (!ctx) return rootHz;

    const now = ctx.currentTime;
    // Play a rich Jazz Seventh / Pentatonic triad (Root + Perfect 5th + Major 7th on kills)
    const intervals = isHazardKill ? [1, 1.25, 1.5, 1.875] : [1, 1.5];

    intervals.forEach((ratio, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === 0 ? 'triangle' : 'sine';
      const freq = rootHz * ratio;
      const startAt = now + idx * 0.015;

      osc.frequency.setValueAtTime(freq, startAt);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.015, startAt + 0.24);

      const peakGain = idx === 0 ? 0.18 : 0.09;
      gain.gain.setValueAtTime(0.001, startAt);
      gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + 0.3);
    });

    return rootHz;
  }

  private playNoiseBurst(durationSec: number, centerHz: number, volume: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const sampleCount = Math.max(128, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = centerHz;
    filter.Q.value = 1.6;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
    source.stop(now + durationSec + 0.01);
  }

  public destroy(): void {
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

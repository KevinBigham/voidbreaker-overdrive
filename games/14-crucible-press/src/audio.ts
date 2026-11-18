import type { SoundEvent } from './types';

export class CrucibleAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private steamSource: AudioBufferSourceNode | null = null;
  private steamFilter: BiquadFilterNode | null = null;
  private steamGain: GainNode | null = null;
  private muted = false;

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.steamGain && this.ctx) {
      this.steamGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return null;
      try {
        this.ctx = new AudioCtor();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.noiseBuffer && this.ctx) {
      const sampleRate = this.ctx.sampleRate;
      const length = sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.ctx;
  }

  /**
   * Updates continuous bandpass-filtered white noise steam hiss whose cutoff frequency
   * and level rise with internal vessel pressure (Bar).
   */
  public updateContinuousSteam(pressureBar: number, ventClosed: boolean): void {
    if (this.muted || pressureBar < 0.35) {
      if (this.steamGain && this.ctx) {
        this.steamGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    if (!this.steamSource || !this.steamFilter || !this.steamGain) {
      try {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        src.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 3.2;
        filter.frequency.value = 900;

        const gain = ctx.createGain();
        gain.gain.value = 0;

        src.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        src.start();

        this.steamSource = src;
        this.steamFilter = filter;
        this.steamGain = gain;
      } catch {
        return;
      }
    }

    const normP = Math.min(1, Math.max(0, pressureBar / 10));
    // Cutoff frequency rises with vessel pressure (750 Hz -> 3600 Hz)
    const targetCutoff = 750 + normP * 2850 + (ventClosed ? 0 : 420);
    const targetQ = ventClosed ? 4.5 - normP * 1.5 : 2.1;
    // Open vent hisses louder at moderate pressure; closed vent whistles tightly near rupture
    const level = ventClosed
      ? Math.pow(normP, 1.8) * 0.055
      : Math.min(0.08, normP * 0.075);

    const now = ctx.currentTime;
    this.steamFilter.frequency.setTargetAtTime(targetCutoff, now, 0.06);
    this.steamFilter.Q.setTargetAtTime(targetQ, now, 0.06);
    this.steamGain.gain.setTargetAtTime(level, now, 0.06);
  }

  public flushEvents(events: SoundEvent[]): void {
    if (events.length === 0) return;
    if (this.muted) {
      events.length = 0;
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) {
      events.length = 0;
      return;
    }

    // Cap per-frame transients so dense cascades stay crisp without clipping
    const maxPerFrame = 5;
    for (let i = 0; i < Math.min(events.length, maxPerFrame); i++) {
      this.playEvent(ctx, events[i]);
    }
    events.length = 0;
  }

  private playEvent(ctx: AudioContext, ev: SoundEvent): void {
    const now = ctx.currentTime;
    const pitch = ev.pitch ?? 1.0;
    const intensity = Math.min(1.5, Math.max(0.1, ev.intensity ?? 0.8));

    switch (ev.type) {
      case 'clink_glass': {
        // Glass-on-glass modal clink pitched inversely by bead radius/mass
        const baseFreq = 1480 * pitch;
        const ratios = [1, 2.38, 3.92];
        ratios.forEach((ratio, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseFreq * ratio, now);
          const amp = (0.045 * intensity) / (idx + 1);
          gain.gain.setValueAtTime(amp, now);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.065 / (idx + 0.8));
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.07);
        });
        break;
      }

      case 'clink_brass': {
        // Warm burnished brass FM transient
        const carrier = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        const gain = ctx.createGain();

        const freq = 520 * pitch;
        carrier.type = 'triangle';
        carrier.frequency.setValueAtTime(freq, now);

        mod.type = 'sine';
        mod.frequency.setValueAtTime(freq * 1.414, now);
        modGain.gain.setValueAtTime(freq * 0.85 * intensity, now);
        modGain.gain.exponentialRampToValueAtTime(1, now + 0.09);

        gain.gain.setValueAtTime(0.065 * intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);

        mod.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(gain);
        gain.connect(ctx.destination);

        carrier.start(now);
        mod.start(now);
        carrier.stop(now + 0.15);
        mod.stop(now + 0.15);
        break;
      }

      case 'thud_lead': {
        // Heavy damped lead impact on brass/walnut
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(145 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(52, now + 0.11);

        gain.gain.setValueAtTime(0.11 * intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
        break;
      }

      case 'ratchet_click': {
        // Mechanical brass pawl tooth click
        this.playFilteredNoiseBurst(ctx, now, 1850 * pitch, 6.5, 0.018, 0.055 * intensity);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(680 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.018);
        gain.gain.setValueAtTime(0.04 * intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.022);
        break;
      }

      case 'bellows_whoosh': {
        // Warm leather air blast through firebox grate
        this.playFilteredNoiseBurst(ctx, now, 440 * pitch, 1.8, 0.22, 0.09 * intensity);
        break;
      }

      case 'shear_snap':
      case 'geode_crack': {
        // Crisp metallic shear + crystalline fracture snap
        this.playFilteredNoiseBurst(ctx, now, 2600 * pitch, 3.4, 0.065, 0.11 * intensity);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(920 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(190, now + 0.08);
        gain.gain.setValueAtTime(0.075 * intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }

      case 'acid_sizzle':
      case 'anvil_hiss': {
        // High-frequency resonant vapor sizzle on heated copper or Vitriol bath
        const center = ev.type === 'anvil_hiss' ? 3200 * pitch : 2400 * pitch;
        this.playFilteredNoiseBurst(ctx, now, center, 4.2, 0.16, 0.065 * intensity);
        break;
      }

      case 'vapor_ignite': {
        // Exothermic alchemical flare inside chamber
        this.playFilteredNoiseBurst(ctx, now, 320, 1.4, 0.24, 0.11 * intensity);
        break;
      }

      case 'aether_chord': {
        // Resonant harmonic glass-brass chord for Triangle (x3) or Quad (x5) loops
        const notes = pitch > 1.2 ? [440, 554.37, 659.25, 880] : [392, 493.88, 587.33];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.015);
          gain.gain.setValueAtTime(0.032 * intensity, now + i * 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.34);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.015);
          osc.stop(now + 0.36);
        });
        break;
      }

      case 'salt_crystallize': {
        // Crystalline harmonic shimmer when Philosopher's Salt freezes & fuses reagents
        const freqs = [1046.5, 1318.5, 1567.98, 2093.0];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f * pitch, now + idx * 0.025);
          gain.gain.setValueAtTime(0.04 * intensity, now + idx * 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.38);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.025);
          osc.stop(now + 0.4);
        });
        break;
      }

      case 'discharge_flush': {
        // Heavy brass release valve opening + pressurized condensation cascade
        this.playFilteredNoiseBurst(ctx, now, 780, 1.6, 0.32, 0.11 * intensity);
        this.playEvent(ctx, { type: 'clink_brass', pitch: 0.72, intensity: 1.1 });
        break;
      }

      case 'coin_chime': {
        // Escalating harmonic brass-bell & scale-pan clink as each coin-weight lands
        const scaleSemitones = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
        const stepIndex = Math.min(
          scaleSemitones.length - 1,
          Math.max(0, Math.round((pitch - 1) * 8))
        );
        const freq = 587.33 * Math.pow(2, scaleSemitones[stepIndex] / 12);

        const carrier = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const gain = ctx.createGain();
        const overGain = ctx.createGain();

        carrier.type = 'triangle';
        carrier.frequency.setValueAtTime(freq, now);
        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(freq * 2.756, now);

        gain.gain.setValueAtTime(0.075 * intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.32);

        overGain.gain.setValueAtTime(0.028 * intensity, now);
        overGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.14);

        carrier.connect(gain);
        overtone.connect(overGain);
        gain.connect(ctx.destination);
        overGain.connect(ctx.destination);

        carrier.start(now);
        overtone.start(now);
        carrier.stop(now + 0.34);
        overtone.stop(now + 0.15);
        break;
      }

      case 'gauge_tick': {
        // High-pressure Bourdon needle tick
        this.playFilteredNoiseBurst(ctx, now, 3400 * pitch, 9.0, 0.01, 0.035 * intensity);
        break;
      }

      case 'glass_crack': {
        // High-tension smoked glass hairline fracture ping
        this.playFilteredNoiseBurst(ctx, now, 4100, 6.0, 0.04, 0.08 * intensity);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2750 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(1820, now + 0.06);
        gain.gain.setValueAtTime(0.05 * intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }

      case 'vessel_blowout': {
        // Overpressure stopper blowout + steam release
        this.playFilteredNoiseBurst(ctx, now, 520, 1.1, 0.45, 0.16);
        this.playEvent(ctx, { type: 'glass_crack', pitch: 0.9, intensity: 1.2 });
        break;
      }

      case 'bolt_attachment':
      case 'commission_seal': {
        // Heavy mechanical bolt / wax seal stamp + resonant brass bell
        this.playEvent(ctx, { type: 'thud_lead', pitch: 0.9, intensity: 1.1 });
        this.playEvent(ctx, { type: 'coin_chime', pitch: 1.5, intensity: 1.0 });
        break;
      }
    }
  }

  private playFilteredNoiseBurst(
    ctx: AudioContext,
    startTime: number,
    centerFreq: number,
    q: number,
    duration: number,
    peakGain: number
  ): void {
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq, startTime);
    filter.Q.setValueAtTime(q, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peakGain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(startTime, Math.random() * 0.8);
    src.stop(startTime + duration + 0.01);
  }

  public destroy(): void {
    if (this.steamSource) {
      try {
        this.steamSource.stop();
      } catch {}
      this.steamSource = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

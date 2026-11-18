/**
 * Procedural WebAudio Foley Engine for THE BRASS CRUCIBLE.
 * Synthesizes warm mechanical ratchets, mass-pitched glass/brass clinks,
 * bandpass-filtered steam hisses, copper anvil sizzles, and harmonic assay scale chimes.
 */
export class CrucibleFoleyEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private lastClinkTime = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
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
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    if (!this.noiseBuffer && this.ctx) {
      const sampleRate = this.ctx.sampleRate;
      const length = sampleRate * 1.5;
      const buf = this.ctx.createBuffer(1, length, sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /**
   * Heavy mechanical ratcheting click when pulling a brass lever or rotating a toothed bezel.
   */
  public playRatchetClick(pitchFactor = 1.0, weight = 1.0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    // 1. Short mechanical tooth impulse (bandpass noise burst)
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1150 * pitchFactor, now);
    filter.Q.setValueAtTime(6.5, now);

    const noiseGain = ctx.createGain();
    const peak = Math.min(0.28, 0.14 * weight);
    noiseGain.gain.setValueAtTime(peak, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.036);

    // 2. Warm brass/walnut detent thud
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240 * pitchFactor, now);
    osc.frequency.exponentialRampToValueAtTime(82 * pitchFactor, now + 0.042);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.16 * weight, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Glass-on-glass or brass-on-brass clink pitched by bead radius/mass.
   * Smaller radius = higher pitch; heavier lead = deeper metallic clank.
   */
  public playBeadClink(radius: number, mass: number, impactSpeed = 120): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (now - this.lastClinkTime < 0.025) return;
    this.lastClinkTime = now;

    // Smaller radius -> higher frequency (range ~520Hz for r=22 lead down to ~1480Hz for r=12 spark)
    const normalizedSize = Math.max(10, Math.min(26, radius));
    const baseFreq = 1950 - normalizedSize * 58 - mass * 45;
    const gainLevel = Math.max(0.02, Math.min(0.22, (impactSpeed / 360) * 0.18));

    // Primary resonant partial
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'triangle';

    // Inharmonic glass/brass overtone ratio (1 : 2.58)
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc2.frequency.setValueAtTime(baseFreq * 2.58, now);

    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();

    const decay = mass > 2.2 ? 0.14 : 0.095;
    gain1.gain.setValueAtTime(gainLevel, now);
    gain1.gain.exponentialRampToValueAtTime(0.0008, now + decay);

    gain2.gain.setValueAtTime(gainLevel * 0.45, now);
    gain2.gain.exponentialRampToValueAtTime(0.0008, now + decay * 0.65);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(ctx.destination);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + decay + 0.01);
    osc2.stop(now + decay + 0.01);
  }

  /**
   * Pressurized steam hiss (bandpass-filtered white noise) whose cutoff frequency
   * rises with vessel internal pressure (Bar) or anvil vaporization.
   */
  public playSteamHiss(pressureBar: number, duration = 0.28, volume = 0.14): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    // Cutoff rises from 900 Hz at low pressure up to 3400 Hz at high pressure
    const cutoff = 900 + Math.min(10, Math.max(0, pressureBar)) * 250;
    bandpass.frequency.setValueAtTime(cutoff, now);
    bandpass.frequency.exponentialRampToValueAtTime(cutoff * 1.25, now + duration * 0.5);
    bandpass.Q.setValueAtTime(2.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.005, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);

    src.start(now);
    src.stop(now + duration + 0.02);
  }

  /**
   * Warm bellows air whoosh + leather creak when pumping thermal pressure.
   */
  public playBellowsPump(intensity = 1.0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(780 * intensity, now + 0.12);
    filter.frequency.exponentialRampToValueAtTime(220, now + 0.28);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.18 * Math.min(1.3, intensity), now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(now);
    src.stop(now + 0.32);
  }

  /**
   * Crisp metallic shear/crack when cleaving a crystal or cracking a Lead Geode shell.
   */
  public playCrystalCleave(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.playRatchetClick(1.35, 1.3);
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(1880, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.16);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1450, now);
    filter.Q.setValueAtTime(4.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * Escalating brass-bell / coin-scale harmonic chime as each minted coin lands on the Assay Scale.
   */
  public playAssayChime(stepIndex: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Lydian/major harmonic intervals in warm brass register
    const ratios = [1, 1.125, 1.25, 1.414, 1.5, 1.667, 1.875, 2.0, 2.25, 2.5];
    const ratio = ratios[stepIndex % ratios.length] * Math.pow(1.06, Math.floor(stepIndex / ratios.length));
    const carrierFreq = 587.33 * ratio; // D5 base brass chime

    // FM Bell pair (Carrier + Modulator at 1 : 2.756 for authentic cast brass bell timbre)
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const masterGain = ctx.createGain();

    carrier.type = 'sine';
    mod.type = 'sine';
    carrier.frequency.setValueAtTime(carrierFreq, now);
    mod.frequency.setValueAtTime(carrierFreq * 2.756, now);

    modGain.gain.setValueAtTime(carrierFreq * 0.85, now);
    modGain.gain.exponentialRampToValueAtTime(1.0, now + 0.18);

    masterGain.gain.setValueAtTime(0.18, now);
    masterGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.42);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(masterGain);
    masterGain.connect(ctx.destination);

    carrier.start(now);
    mod.start(now);
    carrier.stop(now + 0.44);
    mod.stop(now + 0.44);
  }

  /**
   * Resonant galvanic chime when Aether completes a Triangle (x3) or Quad (x5) geometric loop.
   */
  public playGalvanicResonance(loopMultiplier: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseFreq = loopMultiplier >= 5 ? 659.25 : 523.25; // E5 or C5
    const chord = loopMultiplier >= 5 ? [1, 1.25, 1.5, 1.875] : [1, 1.25, 1.5];

    for (let i = 0; i < chord.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq * chord[i], now + i * 0.025);

      gain.gain.setValueAtTime(0.08, now + i * 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26 + i * 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.025);
      osc.stop(now + 0.3 + i * 0.03);
    }
  }
}

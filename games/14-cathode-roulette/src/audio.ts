// Procedural Mechanical & High-Voltage Foley WebAudio Synthesizer
// Zero generic beeps: filtered noise bursts, resonant bandpass clacks, 60Hz cathode hum, and glass shatter transients.

export class CathodeAudioEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private crtOsc: OscillatorNode | null = null;
  private crtGain: GainNode | null = null;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          return null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createNoiseBurst(
    ctx: AudioContext,
    durationSec: number,
    filterType: BiquadFilterType,
    freq: number,
    q: number,
    gainPeak: number,
    startTime: number = ctx.currentTime
  ): void {
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.max(64, Math.floor(sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      const env = Math.pow(1 - i / frameCount, 1.8);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, startTime);
    filter.Q.setValueAtTime(q, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + Math.min(0.004, durationSec * 0.15));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(startTime);
    src.stop(startTime + durationSec + 0.01);
  }

  public playGrabObject(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Tactile felt lift + brass finger-tap
    this.createNoiseBurst(ctx, 0.045, 'bandpass', 1100, 3.2, 0.12, now);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.04);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playMagneticSnap(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Two-part metallic "CLACK-CHUNK" when a cartridge or tool snaps into a brass socket
    this.createNoiseBurst(ctx, 0.035, 'bandpass', 2400, 4.5, 0.24, now);
    this.createNoiseBurst(ctx, 0.075, 'lowpass', 420, 2.2, 0.28, now + 0.018);

    // Low brass housing thud
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(145, now + 0.015);
    thud.frequency.exponentialRampToValueAtTime(48, now + 0.11);
    thudGain.gain.setValueAtTime(0.26, now + 0.015);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(now + 0.015);
    thud.stop(now + 0.13);

    // High brass ring
    const ring = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ring.type = 'triangle';
    ring.frequency.setValueAtTime(780, now);
    ring.frequency.exponentialRampToValueAtTime(520, now + 0.07);
    ringGain.gain.setValueAtTime(0.11, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    ring.connect(ringGain);
    ringGain.connect(ctx.destination);
    ring.start(now);
    ring.stop(now + 0.08);
  }

  public playCathodeWakeup(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    this.playMagneticSnap();

    // 60Hz Mains Transformer Swell
    const mains = ctx.createOscillator();
    const mainsGain = ctx.createGain();
    mains.type = 'sawtooth';
    mains.frequency.setValueAtTime(60, now + 0.05);
    mains.frequency.linearRampToValueAtTime(120, now + 0.65);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, now + 0.05);

    mainsGain.gain.setValueAtTime(0.001, now + 0.05);
    mainsGain.gain.linearRampToValueAtTime(0.16, now + 0.25);
    mainsGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    mains.connect(filter);
    filter.connect(mainsGain);
    mainsGain.connect(ctx.destination);
    mains.start(now + 0.05);
    mains.stop(now + 0.9);

    // Cathode Tube Filament Warm-up Harmonic Sweep
    const tube = ctx.createOscillator();
    const tubeGain = ctx.createGain();
    tube.type = 'sine';
    tube.frequency.setValueAtTime(320, now + 0.08);
    tube.frequency.exponentialRampToValueAtTime(1480, now + 0.75);
    tubeGain.gain.setValueAtTime(0.001, now + 0.08);
    tubeGain.gain.linearRampToValueAtTime(0.08, now + 0.35);
    tubeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    tube.connect(tubeGain);
    tubeGain.connect(ctx.destination);
    tube.start(now + 0.08);
    tube.stop(now + 0.88);
  }

  public playDrumRatchet(step = 0): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pitchShift = 1 + (step % 6) * 0.06;
    this.createNoiseBurst(ctx, 0.028, 'bandpass', 1650 * pitchShift, 5.0, 0.18, now);

    const gear = ctx.createOscillator();
    const gearGain = ctx.createGain();
    gear.type = 'square';
    gear.frequency.setValueAtTime(110 * pitchShift, now);
    gear.frequency.exponentialRampToValueAtTime(55, now + 0.035);
    gearGain.gain.setValueAtTime(0.09, now);
    gearGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    gear.connect(gearGain);
    gearGain.connect(ctx.destination);
    gear.start(now);
    gear.stop(now + 0.045);
  }

  public playKnifeSwitchFlip(toVault: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Heavy spring-loaded copper knife blade snap
    this.createNoiseBurst(ctx, 0.04, 'bandpass', toVault ? 2100 : 1450, 4.0, 0.25, now);
    const blade = ctx.createOscillator();
    const gain = ctx.createGain();
    blade.type = 'triangle';
    blade.frequency.setValueAtTime(toVault ? 290 : 190, now);
    blade.frequency.exponentialRampToValueAtTime(toVault ? 140 : 85, now + 0.065);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    blade.connect(gain);
    gain.connect(ctx.destination);
    blade.start(now);
    blade.stop(now + 0.075);
  }

  public playTransformerCrank(multiplier: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Ratchet clack
    this.createNoiseBurst(ctx, 0.045, 'bandpass', 1800 + multiplier * 160, 4.2, 0.22, now);

    // 60Hz Transformer Step-up Hum + CRT Whine
    const baseFreq = 60 * Math.max(1, multiplier * 0.5);
    const hum = ctx.createOscillator();
    const humGain = ctx.createGain();
    hum.type = 'sawtooth';
    hum.frequency.setValueAtTime(baseFreq, now);
    hum.frequency.linearRampToValueAtTime(baseFreq * 1.25, now + 0.28);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(360 + multiplier * 90, now);

    humGain.gain.setValueAtTime(0.16, now);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    hum.connect(lp);
    lp.connect(humGain);
    humGain.connect(ctx.destination);
    hum.start(now);
    hum.stop(now + 0.34);

    // High-voltage capacitor whine
    const whine = ctx.createOscillator();
    const whineGain = ctx.createGain();
    whine.type = 'sine';
    whine.frequency.setValueAtTime(1800 + multiplier * 450, now);
    whine.frequency.exponentialRampToValueAtTime(2400 + multiplier * 600, now + 0.26);
    whineGain.gain.setValueAtTime(0.06, now);
    whineGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    whine.connect(whineGain);
    whineGain.connect(ctx.destination);
    whine.start(now);
    whine.stop(now + 0.3);
  }

  public playPlungerRatchet(normalizedTravel: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freq = 900 + normalizedTravel * 1200;
    this.createNoiseBurst(ctx, 0.022, 'bandpass', freq, 6.0, 0.14, now);
  }

  public playPlungerSlam(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.createNoiseBurst(ctx, 0.09, 'lowpass', 340, 2.5, 0.35, now);
    const slam = ctx.createOscillator();
    const gain = ctx.createGain();
    slam.type = 'sine';
    slam.frequency.setValueAtTime(130, now);
    slam.frequency.exponentialRampToValueAtTime(34, now + 0.16);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    slam.connect(gain);
    gain.connect(ctx.destination);
    slam.start(now);
    slam.stop(now + 0.18);
  }

  public playVaultDischargeLive(isVolatile = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playPlungerSlam();

    // Heavy capacitor discharge thrum
    const zap = ctx.createOscillator();
    const zapGain = ctx.createGain();
    zap.type = 'sawtooth';
    zap.frequency.setValueAtTime(isVolatile ? 320 : 220, now + 0.02);
    zap.frequency.exponentialRampToValueAtTime(55, now + 0.35);
    zapGain.gain.setValueAtTime(0.28, now + 0.02);
    zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    zap.connect(zapGain);
    zapGain.connect(ctx.destination);
    zap.start(now + 0.02);
    zap.stop(now + 0.4);

    // Physical brass weights clanking onto the balance scale pan
    const clankCount = isVolatile ? 4 : 2;
    for (let i = 0; i < clankCount; i++) {
      const t = now + 0.12 + i * 0.075;
      this.createNoiseBurst(ctx, 0.04, 'bandpass', 2800 + i * 320, 5.5, 0.18, t);
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = 'triangle';
      bell.frequency.setValueAtTime(980 + i * 240, t);
      bell.frequency.exponentialRampToValueAtTime(720 + i * 180, t + 0.14);
      bellGain.gain.setValueAtTime(0.14, t);
      bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      bell.connect(bellGain);
      bellGain.connect(ctx.destination);
      bell.start(t);
      bell.stop(t + 0.16);
    }
  }

  public playVaultDischargeBlank(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playPlungerSlam();
    // Dry inductive misfire clunk + descending buzz
    this.createNoiseBurst(ctx, 0.08, 'bandpass', 620, 3.0, 0.22, now + 0.03);
    const dud = ctx.createOscillator();
    const gain = ctx.createGain();
    dud.type = 'sawtooth';
    dud.frequency.setValueAtTime(140, now + 0.04);
    dud.frequency.linearRampToValueAtTime(68, now + 0.28);
    gain.gain.setValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    dud.connect(gain);
    gain.connect(ctx.destination);
    dud.start(now + 0.04);
    dud.stop(now + 0.32);
  }

  public playChassisGroundSafe(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playPlungerSlam();
    // Clean mechanical relay latch + warm cathode stabilizer chord
    this.createNoiseBurst(ctx, 0.035, 'bandpass', 1950, 4.5, 0.18, now + 0.03);
    const freqs = [440, 660];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + 0.05 + idx * 0.04);
      gain.gain.setValueAtTime(0.11, now + 0.05 + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28 + idx * 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + 0.05 + idx * 0.04);
      osc.stop(now + 0.3 + idx * 0.04);
    });
  }

  public playFuseShatter(shieldAbsorbed = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playPlungerSlam();

    // Ear-splitting high-voltage arc-flash burst
    this.createNoiseBurst(ctx, 0.22, 'bandpass', 1350, 1.4, 0.38, now + 0.01);

    if (shieldAbsorbed) {
      // Heavy lead armor plate clang & stress crack
      const armor = ctx.createOscillator();
      const armorGain = ctx.createGain();
      armor.type = 'triangle';
      armor.frequency.setValueAtTime(280, now + 0.03);
      armor.frequency.exponentialRampToValueAtTime(75, now + 0.26);
      armorGain.gain.setValueAtTime(0.32, now + 0.03);
      armorGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      armor.connect(armorGain);
      armorGain.connect(ctx.destination);
      armor.start(now + 0.03);
      armor.stop(now + 0.3);
      return;
    }

    // High-frequency glass vacuum fuse shatter shards
    const shardFreqs = [3400, 4200, 5100, 2900];
    shardFreqs.forEach((sf, i) => {
      const t = now + 0.04 + i * 0.028;
      this.createNoiseBurst(ctx, 0.055, 'highpass', sf, 4.0, 0.24, t);
      const shard = ctx.createOscillator();
      const shardGain = ctx.createGain();
      shard.type = 'sine';
      shard.frequency.setValueAtTime(sf, t);
      shard.frequency.exponentialRampToValueAtTime(sf * 0.65, t + 0.06);
      shardGain.gain.setValueAtTime(0.12, t);
      shardGain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
      shard.connect(shardGain);
      shardGain.connect(ctx.destination);
      shard.start(t);
      shard.stop(t + 0.07);
    });
  }

  public playQuotaBellAndStamp(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Heavy brass stamp thud + mechanical scale bell ring
    this.createNoiseBurst(ctx, 0.08, 'lowpass', 380, 2.0, 0.3, now);
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(1320, now + 0.04);
    bell.frequency.exponentialRampToValueAtTime(1290, now + 0.55);
    bellGain.gain.setValueAtTime(0.22, now + 0.04);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.start(now + 0.04);
    bell.stop(now + 0.6);
  }
}

import { BLOCK_ARCHETYPES } from './content';
export class OrbitAudioEngine {
    ctx = null;
    muted = false;
    isMuted() {
        return this.muted;
    }
    setMuted(muted) {
        this.muted = muted;
    }
    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
    ensureContext() {
        if (this.muted)
            return null;
        if (typeof window === 'undefined')
            return null;
        const AudioCtx = window.AudioContext ||
            window
                .webkitAudioContext;
        if (!AudioCtx)
            return null;
        if (!this.ctx) {
            try {
                this.ctx = new AudioCtx();
            }
            catch {
                return null;
            }
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => { });
        }
        return this.ctx;
    }
    playRotateTick() {
        const ctx = this.ensureContext();
        if (!ctx)
            return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(760, now + 0.032);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.038);
    }
    playShardLock(color = 0, depth = 0) {
        const ctx = this.ensureContext();
        if (!ctx)
            return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const baseFreq = 95 + depth * 12 + color * 6;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * 1.4, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, now + 0.085);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.095);
    }
    playMatchChord(color = 0, clearedCount = 3, comboMultiplier = 1, cascadeDepth = 1) {
        const ctx = this.ensureContext();
        if (!ctx)
            return;
        const archetype = BLOCK_ARCHETYPES[color] ?? BLOCK_ARCHETYPES[0];
        const rootFreq = archetype.baseFreqHz *
            Math.pow(1.06, Math.min(8, comboMultiplier - 1 + (cascadeDepth - 1) * 2));
        const ratios = [1, 1.25, 1.5, clearedCount >= 5 ? 2.0 : 1.875];
        const now = ctx.currentTime;
        ratios.forEach((ratio, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
            const start = now + idx * 0.035;
            const duration = 0.22;
            osc.frequency.setValueAtTime(rootFreq * ratio, start);
            osc.frequency.exponentialRampToValueAtTime(rootFreq * ratio * 1.015, start + duration);
            gain.gain.setValueAtTime(0.09, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + duration + 0.01);
        });
    }
    playMorphFanfare(newSides) {
        const ctx = this.ensureContext();
        if (!ctx)
            return;
        const notes = newSides === 7 ? [330, 440, 554.37, 659.25] : [392, 523.25, 659.25, 783.99];
        const now = ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            const start = now + idx * 0.055;
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.07, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.26);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.27);
        });
    }
    playPhasePulse() {
        const ctx = this.ensureContext();
        if (!ctx)
            return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.18);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.36);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.39);
    }
    playContainmentBreach() {
        const ctx = this.ensureContext();
        if (!ctx)
            return;
        const now = ctx.currentTime;
        [220, 185, 146.8].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            const start = now + idx * 0.11;
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.1, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.26);
        });
    }
    destroy() {
        if (this.ctx) {
            this.ctx.close().catch(() => { });
            this.ctx = null;
        }
    }
}

export class BroadcastAudioEngine {
    ctx = null;
    muted = false;
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
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => { });
        }
        return this.ctx;
    }
    isMuted() {
        return this.muted;
    }
    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
    playClick() {
        const ctx = this.ensureContext();
        if (!ctx)
            return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.045);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    }
    playWhistle() {
        const ctx = this.ensureContext();
        if (!ctx)
            return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2850, now);
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(42, now);
        lfoGain.gain.setValueAtTime(140, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        lfo.start(now);
        osc.stop(now + 0.29);
        lfo.stop(now + 0.29);
    }
    playHitStickBoom() {
        const ctx = this.ensureContext();
        if (!ctx)
            return;
        const now = ctx.currentTime;
        // Sub-bass punch
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(155, now);
        osc.frequency.exponentialRampToValueAtTime(34, now + 0.28);
        gain.gain.setValueAtTime(0.26, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.31);
    }
    playTouchdownHorn() {
        const ctx = this.ensureContext();
        if (!ctx)
            return;
        const now = ctx.currentTime;
        const freqs = [220, 277.18, 329.63, 440];
        freqs.forEach((f) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, now);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.66);
        });
    }
    playDraftChime() {
        const ctx = this.ensureContext();
        if (!ctx)
            return;
        const now = ctx.currentTime;
        // Iconic 3-note NFL Draft chime (C5 - E5 - G5)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + idx * 0.14;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.14, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.46);
        });
    }
    playRadioJingle() {
        const ctx = this.ensureContext();
        if (!ctx)
            return;
        const now = ctx.currentTime;
        const notes = [330, 392, 440, 523.25, 659.25];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + idx * 0.085;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.1, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.23);
        });
    }
}
export const broadcastAudio = new BroadcastAudioEngine();

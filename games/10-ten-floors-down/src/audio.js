export class DungeonAudio {
    ctx = null;
    muted = false;
    ensureCtx() {
        if (this.muted)
            return null;
        if (this.ctx) {
            if (this.ctx.state === 'suspended') {
                void this.ctx.resume().catch(() => { });
            }
            return this.ctx;
        }
        try {
            const AudioCtx = window.AudioContext ||
                window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        catch {
            this.ctx = null;
        }
        return this.ctx;
    }
    setMuted(mute) {
        this.muted = mute;
    }
    isMuted() {
        return this.muted;
    }
    playStep() {
        const ctx = this.ensureCtx();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(110, now);
            osc.frequency.exponentialRampToValueAtTime(52, now + 0.055);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.065);
        }
        catch {
            // Ignore audio errors
        }
    }
    playStrike() {
        const ctx = this.ensureCtx();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(340, now);
            osc.frequency.exponentialRampToValueAtTime(95, now + 0.12);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.14);
        }
        catch {
            // Ignore
        }
    }
    playPotionShatter() {
        const ctx = this.ensureCtx();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const freqs = [980, 1320, 1640];
            freqs.forEach((f, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now + idx * 0.02);
                osc.frequency.exponentialRampToValueAtTime(f * 0.55, now + 0.16 + idx * 0.02);
                gain.gain.setValueAtTime(0.08, now + idx * 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18 + idx * 0.02);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.02);
                osc.stop(now + 0.2 + idx * 0.02);
            });
        }
        catch {
            // Ignore
        }
    }
    playIdentifyOrUpgrade() {
        const ctx = this.ensureCtx();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const notes = [440, 554.37, 659.25, 880];
            notes.forEach((n, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n, now + idx * 0.055);
                gain.gain.setValueAtTime(0.09, now + idx * 0.055);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.18);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.055);
                osc.stop(now + idx * 0.055 + 0.19);
            });
        }
        catch {
            // Ignore
        }
    }
    playBossTelegraph() {
        const ctx = this.ensureCtx();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(75, now);
            osc.frequency.linearRampToValueAtTime(52, now + 0.35);
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.38);
        }
        catch {
            // Ignore
        }
    }
    destroy() {
        if (this.ctx) {
            void this.ctx.close().catch(() => { });
            this.ctx = null;
        }
    }
}

export class DispatchAudioEngine {
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
    getContext() {
        if (this.muted)
            return null;
        if (typeof window === 'undefined')
            return null;
        const AudioCtx = window.AudioContext ||
            window.webkitAudioContext;
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
    playRelayClick(pitchHz = 520) {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(pitchHz, now);
            osc.frequency.exponentialRampToValueAtTime(pitchHz * 1.4, now + 0.045);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
        }
        catch {
            // Ignore audio failures in headless test environments
        }
    }
    playUndoClick() {
        this.playRelayClick(340);
    }
    playTurnCommitHum(hasShortfall) {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const baseFreq = hasShortfall ? 110 : 180;
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(hasShortfall ? 82 : 240, now + 0.18);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.21);
        }
        catch {
            // Ignore
        }
    }
    playStormStrike() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(95, now);
            osc.frequency.exponentialRampToValueAtTime(42, now + 0.25);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.28);
        }
        catch {
            // Ignore
        }
    }
    playBlackoutAlarm() {
        const ctx = this.getContext();
        if (!ctx)
            return;
        try {
            const now = ctx.currentTime;
            for (let i = 0; i < 2; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                const start = now + i * 0.14;
                osc.frequency.setValueAtTime(440, start);
                osc.frequency.setValueAtTime(310, start + 0.07);
                gain.gain.setValueAtTime(0.06, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(start);
                osc.stop(start + 0.135);
            }
        }
        catch {
            // Ignore
        }
    }
    destroy() {
        if (this.ctx) {
            this.ctx.close().catch(() => { });
            this.ctx = null;
        }
    }
}

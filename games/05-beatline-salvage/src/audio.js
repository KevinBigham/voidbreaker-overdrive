import { getSectionForTimeMs } from './config.ts';
export class BeatlineAudioEngine {
    ctx = null;
    masterGain = null;
    muted = false;
    lastScheduledSubdivisionIdx = -1;
    constructor(muted = false) {
        this.muted = muted;
    }
    ensureContext() {
        if (typeof window === 'undefined')
            return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext ||
                window.webkitAudioContext;
            if (AudioCtx) {
                try {
                    this.ctx = new AudioCtx();
                    this.masterGain = this.ctx.createGain();
                    this.masterGain.gain.value = this.muted ? 0 : 0.28;
                    this.masterGain.connect(this.ctx.destination);
                }
                catch {
                    this.ctx = null;
                }
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => { });
        }
        return this.ctx;
    }
    /**
     * Returns current hardware audio timestamp in milliseconds.
     * Falls back to performance.now() only if WebAudio is unavailable.
     */
    getNowAudioMs() {
        if (this.ctx && this.ctx.state === 'running') {
            return this.ctx.currentTime * 1000;
        }
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
    setMuted(muted) {
        this.muted = muted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(muted ? 0 : 0.28, this.ctx.currentTime);
        }
    }
    isMuted() {
        return this.muted;
    }
    resetScheduler() {
        this.lastScheduledSubdivisionIdx = -1;
    }
    /**
     * Drives the 120 BPM (250ms eighth-note subdivision) procedural industrial-synthwave stems
     * directly from current track time.
     */
    updateTrackMusic(trackTimeMs, route) {
        if (this.muted)
            return;
        const ctx = this.ctx;
        const out = this.masterGain;
        if (!ctx || !out || ctx.state !== 'running')
            return;
        const subdivisionIdx = Math.floor(trackTimeMs / 250);
        if (subdivisionIdx <= this.lastScheduledSubdivisionIdx)
            return;
        this.lastScheduledSubdivisionIdx = subdivisionIdx;
        const now = ctx.currentTime;
        const stepInBar = ((subdivisionIdx % 8) + 8) % 8;
        const section = getSectionForTimeMs(trackTimeMs);
        // 1. Quarter-note Industrial Kick (steps 0, 2, 4, 6)
        if (stepInBar % 2 === 0) {
            this.triggerKick(ctx, out, now, route === 'overdrive' ? 0.55 : 0.42);
        }
        // 2. Backbeat Snare Clank (steps 2, 6)
        if (stepInBar === 2 || stepInBar === 6) {
            this.triggerSnare(ctx, out, now, section.index >= 1 ? 0.26 : 0.16);
        }
        // 3. Eighth-note Synthwave Bass Arpeggio
        const rootMidiBySection = [38, 41, 43, 45]; // D2, F2, G2, A2
        const rootMidi = rootMidiBySection[section.index] ?? 38;
        const arpOffsets = route === 'overdrive'
            ? [0, 12, 7, 15, 0, 12, 10, 19]
            : [0, 0, 7, 12, 0, 0, 10, 7];
        const midiNote = rootMidi + arpOffsets[stepInBar];
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
        this.triggerBassPulse(ctx, out, now, freq, route === 'overdrive' ? 'sawtooth' : 'triangle', route === 'overdrive' ? 0.22 : 0.15);
    }
    playHitSfx(grade, lane, route) {
        if (this.muted)
            return;
        const ctx = this.ensureContext();
        const out = this.masterGain;
        if (!ctx || !out)
            return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        if (grade === 'MISS') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(135, now);
            osc.frequency.exponentialRampToValueAtTime(68, now + 0.14);
            gain.gain.setValueAtTime(0.24, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        }
        else {
            const baseFreq = lane === 'left' ? 523.25 : 659.25; // C5 vs E5
            const mult = grade === 'PERFECT'
                ? route === 'overdrive'
                    ? 1.5
                    : 1.25
                : grade === 'GOOD'
                    ? 1.0
                    : 0.82;
            osc.type = route === 'overdrive' ? 'square' : 'sine';
            osc.frequency.setValueAtTime(baseFreq * mult, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * mult * 1.18, now + 0.075);
            gain.gain.setValueAtTime(grade === 'PERFECT' ? 0.26 : 0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
        }
        osc.connect(gain);
        gain.connect(out);
        osc.start(now);
        osc.stop(now + 0.16);
    }
    playShuntGateSfx() {
        if (this.muted)
            return;
        const ctx = this.ensureContext();
        const out = this.masterGain;
        if (!ctx || !out)
            return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(out);
        osc.start(now);
        osc.stop(now + 0.25);
    }
    playCalibrationPulse(accent = false) {
        if (this.muted)
            return;
        const ctx = this.ensureContext();
        const out = this.masterGain;
        if (!ctx || !out)
            return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(accent ? 987.77 : 659.25, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(out);
        osc.start(now);
        osc.stop(now + 0.08);
    }
    triggerKick(ctx, out, now, peakGain) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(118, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.11);
        gain.gain.setValueAtTime(peakGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(out);
        osc.start(now);
        osc.stop(now + 0.13);
    }
    triggerSnare(ctx, out, now, peakGain) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
        gain.gain.setValueAtTime(peakGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(out);
        osc.start(now);
        osc.stop(now + 0.095);
    }
    triggerBassPulse(ctx, out, now, freq, type, peakGain) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(peakGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.connect(gain);
        gain.connect(out);
        osc.start(now);
        osc.stop(now + 0.2);
    }
    destroy() {
        if (this.ctx) {
            this.ctx.close().catch(() => { });
            this.ctx = null;
            this.masterGain = null;
        }
    }
}

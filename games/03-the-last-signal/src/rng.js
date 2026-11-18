export class SeededRng {
    state;
    constructor(seed) {
        this.state = seed >>> 0 || 1;
    }
    next() {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    nextInt(minInclusive, maxInclusive) {
        const span = maxInclusive - minInclusive + 1;
        return minInclusive + Math.floor(this.next() * span);
    }
    getState() {
        return this.state >>> 0;
    }
    setState(state) {
        this.state = state >>> 0 || 1;
    }
}

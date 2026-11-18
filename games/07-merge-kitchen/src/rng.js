export class SeededRng {
    seed;
    state;
    calls;
    constructor(seed, state, calls = 0) {
        const normalizedSeed = (Number.isFinite(seed) ? Math.floor(seed) : 204807) >>> 0;
        this.seed = normalizedSeed === 0 ? 204807 : normalizedSeed;
        this.state = state !== undefined ? (state >>> 0) : this.seed;
        this.calls = calls;
    }
    static fromSnapshot(snapshot) {
        return new SeededRng(snapshot.seed, snapshot.state, snapshot.calls);
    }
    getSnapshot() {
        return {
            seed: this.seed,
            state: this.state >>> 0,
            calls: this.calls,
        };
    }
    clone() {
        return SeededRng.fromSnapshot(this.getSnapshot());
    }
    /**
     * Returns a deterministic float in [0, 1) using Mulberry32.
     */
    nextFloat() {
        this.calls += 1;
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        this.state = this.state >>> 0;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    /**
     * Returns a deterministic integer in [minInclusive, maxInclusive].
     */
    nextInt(minInclusive, maxInclusive) {
        if (maxInclusive <= minInclusive) {
            return minInclusive;
        }
        const span = maxInclusive - minInclusive + 1;
        return minInclusive + Math.floor(this.nextFloat() * span);
    }
    pick(items) {
        if (items.length === 0) {
            throw new Error('Cannot pick from an empty array');
        }
        const idx = this.nextInt(0, items.length - 1);
        return items[idx];
    }
}

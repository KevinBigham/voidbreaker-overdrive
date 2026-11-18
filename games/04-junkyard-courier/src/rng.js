/**
 * Deterministic Mulberry32 PRNG for reproducible archipelago hazard mutations and contract offers.
 */
export class SeededRng {
    state;
    constructor(seed) {
        this.state = (seed >>> 0) || 1;
    }
    next() {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    nextInt(minInclusive, maxInclusive) {
        if (maxInclusive <= minInclusive)
            return minInclusive;
        return minInclusive + Math.floor(this.next() * (maxInclusive - minInclusive + 1));
    }
    pick(items) {
        if (items.length === 0) {
            throw new Error('Cannot pick from empty array');
        }
        return items[this.nextInt(0, items.length - 1)];
    }
    shuffle(items) {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            const tmp = copy[i];
            copy[i] = copy[j];
            copy[j] = tmp;
        }
        return copy;
    }
    getState() {
        return this.state >>> 0;
    }
    setState(state) {
        this.state = (state >>> 0) || 1;
    }
}

export class SeededRng {
    state;
    constructor(seed) {
        this.state = (seed >>> 0) || 0x1337beef;
    }
    /** Returns a float in [0, 1) using Mulberry32 */
    next() {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        this.state = t >>> 0;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    /** Returns an integer in [min, maxInclusive] */
    nextInt(min, maxInclusive) {
        if (maxInclusive <= min)
            return min;
        return min + Math.floor(this.next() * (maxInclusive - min + 1));
    }
    /** Picks a random element from a non-empty array */
    pick(items) {
        return items[this.nextInt(0, items.length - 1)];
    }
    /** Returns a new shuffled copy of an array using Fisher-Yates */
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
}
export function hashSeedString(input) {
    let h = 2166136261 >>> 0;
    const trimmed = input.trim() || '2026-11-06';
    for (let i = 0; i < trimmed.length; i++) {
        h ^= trimmed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0) || 101010;
}
export function getDailySeedString(now = new Date()) {
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
export function getDailySeedNumber(dateStr = getDailySeedString()) {
    return hashSeedString(`TEN_FLOORS_DAILY_${dateStr}`);
}

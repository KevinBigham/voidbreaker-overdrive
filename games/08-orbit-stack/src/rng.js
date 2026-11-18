/**
 * Mulberry32 deterministic PRNG with serializable internal state.
 */
export function createSeededRng(initialSeed) {
    let state = (initialSeed >>> 0) || 0x1337beef;
    const nextFloat = () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const nextInt = (minInclusive, maxExclusive) => {
        if (maxExclusive <= minInclusive)
            return minInclusive;
        return minInclusive + Math.floor(nextFloat() * (maxExclusive - minInclusive));
    };
    const pick = (items) => {
        if (items.length === 0) {
            throw new Error('Cannot pick from an empty array');
        }
        return items[nextInt(0, items.length)];
    };
    return {
        getState: () => state >>> 0,
        setState: (newState) => {
            state = (newState >>> 0) || 0x1337beef;
        },
        nextFloat,
        nextInt,
        pick,
    };
}

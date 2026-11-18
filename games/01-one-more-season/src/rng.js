export function normalizeSeed(seed) {
    const n = Number.isFinite(seed) ? Math.floor(seed) : 202601;
    // Ensure non-zero unsigned 32-bit integer
    return (n >>> 0) || 1;
}
export function createRng(initialState) {
    let state = normalizeSeed(initialState);
    function nextFloat() {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function nextInt(min, max) {
        const lo = Math.ceil(Math.min(min, max));
        const hi = Math.floor(Math.max(min, max));
        if (lo >= hi)
            return lo;
        return lo + Math.floor(nextFloat() * (hi - lo + 1));
    }
    function getState() {
        return state >>> 0;
    }
    function clone() {
        return createRng(state);
    }
    return {
        nextFloat,
        nextInt,
        getState,
        clone,
    };
}

export function vec2(x = 0, y = 0) {
    return { x, y };
}
export function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}
export function sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}
export function scale(v, s) {
    return { x: v.x * s, y: v.y * s };
}
export function lenSq(v) {
    return v.x * v.x + v.y * v.y;
}
export function len(v) {
    return Math.hypot(v.x, v.y);
}
export function distSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}
export function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
export function normalize(v) {
    const l = Math.hypot(v.x, v.y);
    if (l < 1e-8)
        return { x: 0, y: 0 };
    return { x: v.x / l, y: v.y / l };
}
export function angleBetween(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
}
export function fromAngle(angle, magnitude = 1) {
    return {
        x: Math.cos(angle) * magnitude,
        y: Math.sin(angle) * magnitude,
    };
}
export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}
export function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
}
export function lerpAngle(a, b, t) {
    let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI)
        diff += Math.PI * 2;
    return a + diff * clamp(t, 0, 1);
}
export function circlesOverlap(aPos, aRadius, bPos, bRadius) {
    const r = aRadius + bRadius;
    return distSq(aPos, bPos) <= r * r;
}
/**
 * Shortest distance squared from point P to line segment AB, plus projection parameter t in [0, 1].
 */
export function pointToSegmentDistSq(p, a, b) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const abLenSq = abx * abx + aby * aby;
    if (abLenSq < 1e-8) {
        return { distSq: distSq(p, a), t: 0, closest: { x: a.x, y: a.y } };
    }
    const apx = p.x - a.x;
    const apy = p.y - a.y;
    const t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
    const closest = { x: a.x + abx * t, y: a.y + aby * t };
    return { distSq: distSq(p, closest), t, closest };
}
/**
 * Deterministic Mulberry32 PRNG for Daily Seed Runs & reproducible combat tests.
 */
export class SeededRandom {
    state;
    constructor(seedInput = Date.now()) {
        if (typeof seedInput === 'number') {
            this.state = seedInput >>> 0 || 0x1337beef;
        }
        else {
            let h = 2166136261 >>> 0;
            for (let i = 0; i < seedInput.length; i++) {
                h ^= seedInput.charCodeAt(i);
                h = Math.imul(h, 16777619);
            }
            this.state = h >>> 0 || 0x1337beef;
        }
    }
    next() {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    range(min, max) {
        return min + this.next() * (max - min);
    }
    int(min, maxInclusive) {
        return Math.floor(this.range(min, maxInclusive + 1));
    }
    pick(items) {
        return items[Math.floor(this.next() * items.length)];
    }
    shuffle(items) {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            const tmp = copy[i];
            copy[i] = copy[j];
            copy[j] = tmp;
        }
        return copy;
    }
}

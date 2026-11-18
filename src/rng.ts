/**
 * CHRONO-FOUNDRY: THE INERTIA GAMBIT
 * Deterministic Seeded PRNG (Mulberry32)
 * Zero external dependencies. 100% pure state transitions.
 */

export interface SeededRngState {
  seed: number;
  state: number;
}

export function createRngState(seed: number): SeededRngState {
  const normalized = (Math.floor(seed) >>> 0) || 0x6d2b79f5;
  return {
    seed: normalized,
    state: normalized,
  };
}

/**
 * Steps Mulberry32 state deterministically and returns a float in [0, 1)
 * along with the next immutable RNG state.
 */
export function nextRandom(rng: SeededRngState): { value: number; rng: SeededRngState } {
  let t = (rng.state + 0x6d2b79f5) >>> 0;
  const nextState = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return {
    value,
    rng: {
      seed: rng.seed,
      state: nextState,
    },
  };
}

/**
 * Stateful helper wrapper around SeededRngState for ergonomic multi-step calls
 * inside a single pure reducer pass.
 */
export class Mulberry32 {
  private current: number;
  public readonly initialSeed: number;

  constructor(seed: number, currentState?: number) {
    this.initialSeed = (Math.floor(seed) >>> 0) || 0x6d2b79f5;
    this.current = currentState !== undefined ? (currentState >>> 0) : this.initialSeed;
  }

  public next(): number {
    let t = (this.current + 0x6d2b79f5) >>> 0;
    this.current = t;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextInt(minInclusive: number, maxInclusive: number): number {
    if (maxInclusive <= minInclusive) return minInclusive;
    return minInclusive + Math.floor(this.next() * (maxInclusive - minInclusive + 1));
  }

  public pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return items[Math.floor(this.next() * items.length)];
  }

  public shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  public getState(): number {
    return this.current >>> 0;
  }

  public clone(): Mulberry32 {
    return new Mulberry32(this.initialSeed, this.current);
  }
}

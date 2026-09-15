/** Mulberry32 — tiny deterministic RNG for server-seeded gacha and clash. */
export class SeededRng {
  private s: number;
  count = 0;

  constructor(seed: number) {
    this.s = seed >>> 0 || 1;
  }

  next(): number {
    this.count += 1;
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Inclusive integer in [min, max]. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) {
      throw new Error("pick() on empty array");
    }
    return arr[this.int(0, arr.length - 1)]!;
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  }

  /** Restore a previously persisted RNG (seed + how far it was advanced). */
  static restore(seed: number, count: number): SeededRng {
    const rng = new SeededRng(seed);
    for (let i = 0; i < count; i++) rng.next();
    rng.count = count;
    return rng;
  }
}

export function hashSeed(...parts: Array<string | number>): number {
  let h = 2166136261;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

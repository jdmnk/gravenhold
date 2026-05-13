export type Rng = {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
};

export function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createRng(seed: string): Rng {
  let state = hashSeed(seed) || 1;

  function next() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  }

  function int(min: number, max: number) {
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error("RNG bounds must be integers.");
    }

    if (max < min) {
      throw new Error(`Invalid RNG range: ${min}..${max}.`);
    }

    return min + Math.floor(next() * (max - min + 1));
  }

  return {
    int,
    next,
    pick<T>(items: readonly T[]) {
      if (items.length === 0) {
        throw new Error("Cannot pick from an empty list.");
      }

      return items[int(0, items.length - 1)]!;
    },
  };
}

/**
 * Simple seeded random number generator using mulberry32
 * Returns values between 0 and 1
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Get a random integer between 0 (inclusive) and max (exclusive)
   */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

/**
 * Select a random character from a string using a seeded position
 */
export function getRandomChar(
  chars: string,
  seed: number,
  position: number
): string {
  if (!chars || chars.length === 0) return ' ';
  const rng = new SeededRandom(seed + position);
  return chars[rng.nextInt(chars.length)];
}


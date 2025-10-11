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

/**
 * Select a character based on luminance value (gradient mapping)
 * Maps luminance (0-255) to character index
 */
export function getCharByLuminance(
  chars: string,
  luminance: number
): string {
  if (!chars || chars.length === 0) return ' ';
  if (chars.length === 1) return chars[0];

  // Map luminance (0-255) to character index
  const normalized = luminance / 255;
  const index = Math.floor(normalized * chars.length);
  // Clamp to valid range
  return chars[Math.min(index, chars.length - 1)];
}

/**
 * Shuffle a string of characters using a seed
 */
export function shuffleString(str: string, seed: number): string {
  const chars = str.split('');
  const rng = new SeededRandom(seed);

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}


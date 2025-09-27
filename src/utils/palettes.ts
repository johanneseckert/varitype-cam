export type PaletteName = 'Classic' | 'Blocks' | 'Minimal' | 'Alpha' | 'Bars' | 'Custom'

export const PALETTES: Record<PaletteName, string> = {
  Classic: '@#%*+=-:. ',
  Blocks: '█▓▒░· ',
  Minimal: '#· ',
  Alpha: 'MWNHD$&%*o=+;:-,.· ',
  Bars: '█▇▆▅▄▃▂▁ ',
  Custom: '@#%*+=-:. ', // Default to Classic when first selecting Custom
}

export const DEFAULT_PALETTE_NAME: PaletteName = 'Custom'

export function getPalette(name: PaletteName, customChars?: string): string[] {
  if (name === 'Custom') {
    if (!customChars || customChars.trim().length === 0) {
      // Fallback to a minimal safe palette if custom is empty
      return ['.', '#']
    }
    // Remove duplicates and ensure at least one character
    const chars = Array.from(new Set(customChars.split(''))).filter(c => c.trim())
    return chars.length > 0 ? chars : ['.', '#']
  }
  return (PALETTES[name] ?? PALETTES.Classic).split('')
}



export type PaletteName = 'Classic' | 'Blocks' | 'Minimal' | 'Alpha' | 'Bars'

export const PALETTES: Record<PaletteName, string> = {
  Classic: '@#%*+=-:. ',
  Blocks: '█▓▒░· ',
  Minimal: '#· ',
  Alpha: 'MWNHD$&%*o=+;:-,.· ',
  Bars: '█▇▆▅▄▃▂▁ ',
}

export const DEFAULT_PALETTE_NAME: PaletteName = 'Classic'

export function getPalette(name: PaletteName): string[] {
  return (PALETTES[name] ?? PALETTES.Classic).split('')
}



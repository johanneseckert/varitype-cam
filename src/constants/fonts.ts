export interface VariableFontAxis {
  name: string; // CSS axis name (e.g., 'wght', 'BACK')
  label: string; // Human readable (e.g., 'Weight', 'Background')
  min: number;
  max: number;
  default?: number; // Default value for secondary axes
}

export interface VariableFontConfig {
  id: string;
  name: string;
  family: string; // CSS font-family value
  charAspectRatio: number; // Width/height ratio for spacing calculations
  primaryAxis: VariableFontAxis; // Driven by luminance mapping
  secondaryAxes?: VariableFontAxis[]; // User-controllable axes (optional)
}

/**
 * To add a new variable font:
 * 1. Place the .ttf file in /public/ directory
 * 2. Add @font-face declaration in src/index.css with format('truetype-variations')
 * 3. Add font configuration below with proper axis ranges
 *
 * Note: Canvas 2D only supports locally hosted variable fonts, not web font services.
 */
export const FONTS: Record<string, VariableFontConfig> = {
  'geist-mono': {
    id: 'geist-mono',
    name: 'Geist Mono',
    family: 'Geist Mono Variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 100,
      max: 900
    }
  },
  'doto': {
    id: 'doto',
    name: 'Doto',
    family: 'Doto Variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 100,
      max: 900
    },
    secondaryAxes: [
      {
        name: 'ROND',
        label: 'Roundness',
        min: 0,
        max: 100,
        default: 0
      }
    ]
  },
  'jetbrains-mono': {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    family: 'JetBrains Mono Variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 100,
      max: 800
    }
  },
  'sono': {
    id: 'sono',
    name: 'Sono',
    family: 'Sono Variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 200,
      max: 800
    },
    secondaryAxes: [
      {
        name: 'MONO',
        label: 'Monospace',
        min: 0,
        max: 1,
        default: 1
      }
    ]
  },
  'bitcount-grid-single': {
    id: 'bitcount-grid-single',
    name: 'Bitcount Grid Single',
    family: 'Bitcount Grid Single',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 100,
      max: 900
    },
    secondaryAxes: [
      {
        name: 'ELSH',
        label: 'Shape',
        min: 0,
        max: 100,
        default: 0
      },
      {
        name: 'ELXP',
        label: 'Expansion',
        min: 0,
        max: 100,
        default: 0
      }
    ]
  },
  'bodoni-moda': {
    id: 'bodoni-moda',
    name: 'Bodoni Moda',
    family: 'Bodoni Moda Variable',
    charAspectRatio: 0.5,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 400,
      max: 900
    }
  },
  'grenze-gotisch': {
    id: 'grenze-gotisch',
    name: 'Grenze Gotisch',
    family: 'Grenze Gotisch Variable',
    charAspectRatio: 0.5,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 100,
      max: 900
    }
  },
  'linefont': {
    id: 'linefont',
    name: 'Linefont',
    family: 'Linefont Variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 4,
      max: 1000
    }
  },
  'big-shoulders-stencil': {
    id: 'big-shoulders-stencil',
    name: 'Big Shoulders Stencil',
    family: 'Big Shoulders Stencil Variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 100,
      max: 900
    }
  }
};

export const DEFAULT_FONT = 'geist-mono';

export type FontId = keyof typeof FONTS;


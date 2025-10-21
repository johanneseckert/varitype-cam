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
  'lexia-mono': {
    id: 'lexia-mono',
    name: 'Lexia Mono Variable',
    family: 'lexia-mono-variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 100,
      max: 900
    }
  },
  'config-variable': {
    id: 'config-variable',
    name: 'Config Variable',
    family: 'config-variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 100,
      max: 900
    }
  },
  'bd-orange-variable': {
    id: 'bd-orange-variable',
    name: 'BD Orange Variable',
    family: 'bd-orange-variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 100,
      max: 800
    }
  },
  'tourney-variable': {
    id: 'tourney-variable',
    name: 'Tourney Variable',
    family: 'tourney-variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 100,
      max: 900
    }
  },
  'climate-crisis-variable': {
    id: 'climate-crisis-variable',
    name: 'Climate Crisis Variable',
    family: 'climate-crisis-variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'YEAR',
      label: 'Year',
      min: 1979,
      max: 2050
    }
  },
  'ds-ddungsang-variable': {
    id: 'ds-ddungsang-variable',
    name: 'DS Ddungsang Variable',
    family: 'ds-ddungsang-variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 400,
      max: 800
    }
  },
  'luke-variable': {
    id: 'luke-variable',
    name: 'Luke Variable',
    family: 'luke-variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'FILL',
      label: 'Fill',
      min: 100,
      max: 300
    }
  },
  'aglet-mono-variable': {
    id: 'aglet-mono-variable',
    name: 'Aglet Mono Variable',
    family: 'aglet-mono-variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 200,
      max: 900
    }
  },
  'vinila-variable': {
    id: 'vinila-variable',
    name: 'Vinila Variable',
    family: 'vinila-variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 100,
      max: 900
    }
  },
  'din-condensed-variable': {
    id: 'din-condensed-variable',
    name: 'DIN Condensed Variable',
    family: 'din-condensed-variable',
    charAspectRatio: 0.5,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 300,
      max: 600
    }
  },
  'littlebit-dotty-variable': {
    id: 'littlebit-dotty-variable',
    name: 'Littlebit Dotty Variable',
    family: 'littlebit-dotty-variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'DOTS',
      label: 'Dot Size',
      min: 0,
      max: 1000
    }
  },
  'gridlite-pe': {
    id: 'gridlite-pe',
    name: 'Gridlite PE Variable',
    family: 'gridlite-pe-variable',
    charAspectRatio: 0.6,
    primaryAxis: {
      name: 'wght',
      label: 'Weight',
      min: 1,
      max: 900
    },
    secondaryAxes: [
      {
        name: 'BACK',
        label: 'Background',
        min: 1,
        max: 900,
        default: 200
      },
      {
        name: 'RECT',
        label: 'Rectangle',
        min: 1,
        max: 900,
        default: 200
      },
      {
        name: 'ELSH',
        label: 'Shape',
        min: 1,
        max: 4,
        default: 3
      }
    ]
  }
};

export const DEFAULT_FONT = 'geist-mono';

export type FontId = keyof typeof FONTS;


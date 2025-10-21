export const ASCII_PRESETS = {
  'Blocks': '█▓▒░',
  'Classic ASCII': ' .:-=+*#%@',
  'Dots': '·⋅•●○',
  'Bars': '▁▂▃▄▅▆▇█',
  'Alphanumeric': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  'Binary': '01',
  'LineFont Special': 'ĀŤĀŤĀŤĀŤĀŤĀŤĀŤŤĀĀŤŤĀĀŤŤĀĀŤŤĀĀŤŤĀĀŤŤŤŤĀĀĀĀŤŤŤŤĀĀĀĀŤŤŤŤĀĀŤŤŤŤĀĀĀĀŤŤŤŤŤŤŤŤĀĀĀĀĀĀĀĀŤŤŤŤŤŤŤŤĀĀĀĀĀĀĀĀĀĀĀŤŤŤŤŤŤŤŤŤŤŤŤŤŤŤŤĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀĀŤŤŤŤŤŤŤŤŤŤŤŤŤŤŤŤĀĀĀĀĀĀĀĀ',
  'MAX': 'MAX',
  'Single M': 'M',
  'Single @': '@',
  'Custom': ''
} as const;

export type PresetName = keyof typeof ASCII_PRESETS;

export const PRESET_OPTIONS = Object.keys(ASCII_PRESETS) as PresetName[];


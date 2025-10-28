// MIDI Control Configuration
// These mappings will be populated after testing with the actual MIDI controller

export interface ControlMapping {
  path: string; // Leva control path (e.g., 'resolution', 'brightness')
  min: number;  // Minimum value for the control
  max: number;  // Maximum value for the control
}

export interface ButtonAction {
  action: 'toggleInvert' | 'export' | 'loadOverlay' | 'removeOverlay' | 'cyclePresetForward' | 'cyclePresetBackward' | 'toggleRandomize';
}

// Helper function to create a unique key for channel+controller or channel+note
export function midiKey(channel: number, number: number): string {
  return `${channel}:${number}`;
}

// Map MIDI CC (Control Change) to Leva slider controls
// Key format: "channel:controller" (e.g., "1:7" for channel 1, CC 7)
// CC values range from 0-127 and will be scaled to the control's min/max range
export const CC_MAPPINGS: Record<string, ControlMapping> = {
  '1:28': { path: 'brightness', min: -100, max: 100 },
  '2:28': { path: 'contrast', min: 0, max: 200 },
  '15:8': { path: 'gamma', min: 0.1, max: 3.0 },
  '9:0': { path: 'resolution', min: 30, max: 250 },
};

// Map MIDI Note to button actions
// Key format: "channel:note" (e.g., "1:60" for channel 1, note 60)
// Note On (velocity > 0) will trigger the action
export const NOTE_MAPPINGS: Record<string, ButtonAction> = {
  '5:23': { action: 'toggleInvert' },
  '5:27': { action: 'toggleRandomize' },
  '9:5': { action: 'cyclePresetBackward' },
  '10:6': { action: 'cyclePresetForward' },
};


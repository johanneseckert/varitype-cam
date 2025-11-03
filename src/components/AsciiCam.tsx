import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useControls, button, folder } from 'leva';
import { useWebcam } from '../hooks/useWebcam';
import { useAsciiRenderer } from '../hooks/useAsciiRenderer';
import { useImageExport, type ExportSettings } from '../hooks/useImageExport';
import { useImageOverlay } from '../hooks/useImageOverlay';
import { useMidi } from '../hooks/useMidi';
import { ASCII_PRESETS, PRESET_OPTIONS, type PresetName } from '../constants/asciiPresets';
import { FONTS, DEFAULT_FONT, type FontId } from '../constants/fonts';
import { getRandomChar, shuffleString } from '../utils/seededRandom';
import { CC_MAPPINGS, NOTE_MAPPINGS, midiKey } from '../constants/midiConfig';

interface AsciiCamProps {
  onCameraStart?: () => void;
}

export function AsciiCam({ onCameraStart }: AsciiCamProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { video, isReady, error, isLoading, hasStarted, startWebcam } = useWebcam();
  const { exportToPNG, exportToPNG4x } = useImageExport();
  const { overlay, loadOverlay, removeOverlay } = useImageOverlay();
  const { isConnected, error: midiError, lastMessage, requestMidiAccess, onMidiMessage } = useMidi();
  const [isPaused, setIsPaused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Notify parent when camera starts
  useEffect(() => {
    if (isReady && onCameraStart) {
      onCameraStart();
    }
  }, [isReady, onCameraStart]);

  // Create font options for Leva dropdown
  const fontOptions = useMemo(() => {
    return Object.fromEntries(
      Object.values(FONTS).map(font => [font.name, font.id])
    );
  }, []);

  // Leva controls (everything except Font-specific controls)
  const [settings, setSettings] = useControls(() => ({
    'Character Set': folder({
      preset: {
        value: 'MAX' as PresetName,
        options: PRESET_OPTIONS,
        label: 'Preset'
      },
      customChars: {
        value: '',
        label: 'Custom Characters',
        render: (get) => get('Character Set.preset') === 'Custom'
      },
      randomize: {
        value: false,
        label: 'Randomize',
        render: (get) => {
          const preset = get('Character Set.preset') as PresetName;
          const chars = preset === 'Custom'
            ? get('Character Set.customChars')
            : ASCII_PRESETS[preset];
          return chars.length > 1;
        }
      },
      mappingMode: {
        value: 'gradient' as 'random' | 'gradient' | 'hue',
        options: {
          'Random Position': 'random',
          'Map to Brightness': 'gradient',
          'Map to Color': 'hue'
        },
        label: 'Mapping Mode',
        render: (get) => {
          const preset = get('Character Set.preset') as PresetName;
          const chars = preset === 'Custom'
            ? get('Character Set.customChars')
            : ASCII_PRESETS[preset];
          const randomize = get('Character Set.randomize');
          return chars.length > 1 && randomize;
        }
      },
      gradientSeed: {
        value: 42,
        min: 0,
        max: 100,
        step: 1,
        label: 'Gradient Seed',
        render: (get) => {
          const preset = get('Character Set.preset') as PresetName;
          const chars = preset === 'Custom'
            ? get('Character Set.customChars')
            : ASCII_PRESETS[preset];
          const randomize = get('Character Set.randomize');
          return chars.length > 1 && randomize && get('Character Set.mappingMode') === 'gradient';
        }
      },
      randomSeed: {
        value: 42,
        min: 0,
        max: 100,
        step: 1,
        label: 'Position Seed',
        render: (get) => {
          const preset = get('Character Set.preset') as PresetName;
          const chars = preset === 'Custom'
            ? get('Character Set.customChars')
            : ASCII_PRESETS[preset];
          const randomize = get('Character Set.randomize');
          return chars.length > 1 && get('Character Set.mappingMode') === 'random' && randomize;
        }
      },
      hueSeed: {
        value: 42,
        min: 0,
        max: 100,
        step: 1,
        label: 'Hue Seed',
        render: (get) => {
          const preset = get('Character Set.preset') as PresetName;
          const chars = preset === 'Custom'
            ? get('Character Set.customChars')
            : ASCII_PRESETS[preset];
          const randomize = get('Character Set.randomize');
          return chars.length > 1 && randomize && get('Character Set.mappingMode') === 'hue';
        }
      }
    }),

    'Appearance': folder({
      aspectRatio: {
        value: '16:9',
        options: ['16:9', '4:3', '1:1', 'Tarot'],
        label: 'Aspect Ratio'
      },
      resolution: {
        value: 100,
        min: 30,
        max: 250,
        step: 1,
        label: 'Resolution (detail level)'
      },
      colorMode: {
        value: 'monochrome' as 'monochrome' | 'colored',
        options: ['monochrome', 'colored'],
        label: 'Color Mode'
      },
      foregroundColor: {
        value: '#ffffff',
        label: 'Foreground',
        render: (get) => get('Appearance.colorMode') === 'monochrome'
      },
      backgroundColor: {
        value: '#000000',
        label: 'Background'
      }
    }),

    'Video Feed': folder({
      brightness: {
        value: 0,
        min: -100,
        max: 100,
        step: 1,
        label: 'Brightness'
      },
      contrast: {
        value: 100,
        min: 0,
        max: 200,
        step: 1,
        label: 'Contrast'
      },
      gamma: {
        value: 1.0,
        min: 0.1,
        max: 3.0,
        step: 0.1,
        label: 'Gamma'
      },
      invert: {
        value: false,
        label: 'Invert'
      }
    }),

    'Overlay': folder({
      'Load Image Overlay': button(() => loadOverlay()),
      'Remove Overlay': button(() => removeOverlay(), {
        disabled: !overlay
      })
    }),

    'MIDI Control (Experimental)': folder({
      'Request MIDI Access': button(() => requestMidiAccess()),
      'Connected': {
        value: isConnected,
        disabled: true
      },
      'Info': {
        value: isConnected ? 'Check console for MIDI messages' : (midiError || 'Click Request MIDI Access'),
        editable: false
      }
    }, { collapsed: true })
  }), [isConnected, midiError]);

  // Separate Font controls so we can rebuild min/max when font changes
  const [fontIdLocal, setFontIdLocal] = useState<FontId>(DEFAULT_FONT);
  const [fontSettings, setFontSettings] = useControls(
    'Font',
    () => {
      const selectedFont = FONTS[fontIdLocal] || FONTS[DEFAULT_FONT];
      const primary = selectedFont.primaryAxis;
      return {
        fontId: {
          value: fontIdLocal,
          options: fontOptions,
          label: 'Font Family',
          onChange: (next: FontId) => {
            const newFont = FONTS[next];
            setFontIdLocal(next);
            // Reset axis values to new font's defaults
            setTimeout(() => {
              setFontSettings({
                minAxis: newFont.primaryAxis.min,
                maxAxis: newFont.primaryAxis.max
              });
            }, 0);
          }
        },
        minAxis: {
          value: primary.min,
          min: primary.min,
          max: primary.max,
          step: 1,
          label: `Min ${primary.label} (dark)`
        },
        maxAxis: {
          value: primary.max,
          min: primary.min,
          max: primary.max,
          step: 1,
          label: `Max ${primary.label} (bright)`
        },
        lineHeight: {
          value: 1.0,
          min: 0.6,
          max: 1.6,
          step: 0.1,
          label: 'Line Height'
        },
        letterSpacing: {
          value: 1.0,
          min: 0.6,
          max: 1.6,
          step: 0.1,
          label: 'Letter Spacing'
        }
      };
    },
    [fontIdLocal]
  );

  // Determine which characters to use
  const characters = settings.preset === 'Custom'
    ? settings.customChars || 'M'
    : ASCII_PRESETS[settings.preset];

  // Get primary axis values from fontSettings (fallback to current font defaults)
  const currentFont = FONTS[fontIdLocal] || FONTS[DEFAULT_FONT];
  const fontSettingsAny = fontSettings as any;
  const minAxisValue = typeof fontSettingsAny.minAxis === 'number' ? fontSettingsAny.minAxis : currentFont.primaryAxis.min;
  const maxAxisValue = typeof fontSettingsAny.maxAxis === 'number' ? fontSettingsAny.maxAxis : currentFont.primaryAxis.max;

  // Calculate grid dimensions (needed for export)
  const gridDimensions = useMemo(() => {
    const font = FONTS[fontIdLocal] || FONTS[DEFAULT_FONT];
    const charAspectRatio = font.charAspectRatio;
    const targetCanvasWidth = Math.min(window.innerWidth * 0.8, 1600);

    let targetAspectRatio: number;
    switch (settings.aspectRatio) {
      case '4:3':
        targetAspectRatio = 4 / 3;
        break;
      case '1:1':
        targetAspectRatio = 1;
        break;
      case 'Tarot':
        targetAspectRatio = 536 / 765;
        break;
      case '16:9':
        targetAspectRatio = 16 / 9;
        break;
      default:
        targetAspectRatio = 16 / 9;
        break;
    }

    const baseCols = settings.resolution;
    const fontSize = targetCanvasWidth / (baseCols * charAspectRatio);
    const baseFontSize = fontSize;
    const letterSpacingValue = typeof fontSettingsAny.letterSpacing === 'number' ? fontSettingsAny.letterSpacing : 1.0;
    const lineHeightValue = typeof fontSettingsAny.lineHeight === 'number' ? fontSettingsAny.lineHeight : 1.0;
    const charWidth = baseFontSize * charAspectRatio * letterSpacingValue;
    const canvasWidth = targetCanvasWidth;
    const cols = Math.floor(canvasWidth / charWidth);
    const canvasHeight = canvasWidth / targetAspectRatio;
    const rowHeight = baseFontSize * lineHeightValue;
    const rows = Math.floor(canvasHeight / rowHeight);

    return {
      cols,
      rows,
      canvasWidth,
      canvasHeight,
      charWidth,
      charHeight: rowHeight,
      fontSize: baseFontSize
    };
  }, [settings.resolution, settings.aspectRatio, fontSettingsAny.lineHeight, fontSettingsAny.letterSpacing, fontIdLocal, video]);

  // Pre-generate character lookup table - needed for export
  const charLookup = useMemo(() => {
    if (characters.length <= 1) return null;

    // If randomize is off, don't need lookup - we'll use sequential looping
    if (!settings.randomize) return null;

    // Only for random mode when randomize is on
    if (settings.mappingMode !== 'random') return null;

    const { cols, rows } = gridDimensions;
    const total = cols * rows;
    const chars = new Array(total);

    for (let i = 0; i < total; i++) {
      chars[i] = getRandomChar(characters, settings.randomSeed, i);
    }

    return chars;
  }, [characters, settings.randomSeed, settings.randomize, settings.mappingMode, gridDimensions]);

  // Shuffled character string for gradient modes - needed for export
  const gradientChars = useMemo(() => {
    if (characters.length <= 1) return characters;

    // If randomize is off, use original order
    if (!settings.randomize) return characters;

    // Shuffle for gradient/hue modes when randomize is on
    if (settings.mappingMode !== 'gradient' && settings.mappingMode !== 'hue') {
      return characters;
    }
    const seed = settings.mappingMode === 'hue' ? settings.hueSeed : settings.gradientSeed;
    return shuffleString(characters, seed);
  }, [characters, settings.gradientSeed, settings.hueSeed, settings.randomize, settings.mappingMode]);

  // Prepare export settings for 4x export
  const exportSettings: ExportSettings = useMemo(() => ({
    video,
    overlay,
    fontId: fontIdLocal,
    fontSize: gridDimensions.fontSize,
    lineHeight: typeof fontSettingsAny.lineHeight === 'number' ? fontSettingsAny.lineHeight : 1.0,
    letterSpacing: typeof fontSettingsAny.letterSpacing === 'number' ? fontSettingsAny.letterSpacing : 1.0,
    characters,
    charLookup,
    gradientChars,
    randomize: Boolean(settings.randomize),
    mappingMode: settings.mappingMode as 'random' | 'gradient' | 'hue',
    cols: gridDimensions.cols,
    rows: gridDimensions.rows,
    canvasWidth: gridDimensions.canvasWidth,
    canvasHeight: gridDimensions.canvasHeight,
    charWidth: gridDimensions.charWidth,
    charHeight: gridDimensions.charHeight,
    colorMode: settings.colorMode as 'monochrome' | 'colored',
    foregroundColor: String(settings.foregroundColor),
    backgroundColor: String(settings.backgroundColor),
    brightness: Number(settings.brightness),
    contrast: Number(settings.contrast),
    gamma: Number(settings.gamma),
    invert: Boolean(settings.invert),
    minAxis: minAxisValue,
    maxAxis: maxAxisValue
  }), [
    video,
    overlay,
    fontIdLocal,
    gridDimensions,
    fontSettings,
    characters,
    charLookup,
    gradientChars,
    settings,
    minAxisValue,
    maxAxisValue
  ]);

  // Export controls (below Font) - dependencies ensure buttons always have latest state
  useControls('Export', {
    'Export PNG (1x)': button(() => exportToPNG(canvasRef.current)),
    'Export PNG (4x)': button(() => exportToPNG4x(exportSettings))
  }, { collapsed: true }, [exportSettings]);

  // MIDI message handler
  const handleMidiMessage = useCallback((message: typeof lastMessage) => {
    if (!message) return;

    if (message.type === 'cc') {
      // Handle CC messages - update sliders
      const key = midiKey(message.channel, message.controller);
      const mapping = CC_MAPPINGS[key];
      if (mapping) {
        // Scale MIDI value (0-127) to control's range (min-max)
        const scaledValue = mapping.min + (message.value / 127) * (mapping.max - mapping.min);
        setSettings({ [mapping.path]: scaledValue });
      }
    } else if (message.type === 'note' && message.on) {
      // Handle Note On messages - trigger buttons
      const key = midiKey(message.channel, message.note);
      const action = NOTE_MAPPINGS[key];
      if (action) {
        switch (action.action) {
          case 'toggleInvert':
            setSettings({ invert: !settings.invert });
            break;
          case 'export':
            exportToPNG(canvasRef.current);
            break;
          case 'loadOverlay':
            loadOverlay();
            break;
          case 'removeOverlay':
            removeOverlay();
            break;
          case 'cyclePresetForward': {
            // Cycle through presets forward (excluding Custom)
            const availablePresets = PRESET_OPTIONS.filter(p => p !== 'Custom') as PresetName[];
            const currentIndex = availablePresets.indexOf(settings.preset as PresetName);
            // If current preset is Custom or not found (-1), (-1 + 1) % length = 0 (start from beginning)
            const nextIndex = (currentIndex + 1) % availablePresets.length;
            setSettings({ preset: availablePresets[nextIndex] });
            break;
          }
          case 'cyclePresetBackward': {
            // Cycle through presets backward (excluding Custom)
            const availablePresets = PRESET_OPTIONS.filter(p => p !== 'Custom') as PresetName[];
            const currentIndex = availablePresets.indexOf(settings.preset as PresetName);
            // If current preset is Custom or not found (-1), wrap to last preset
            const prevIndex = (currentIndex - 1 + availablePresets.length) % availablePresets.length;
            setSettings({ preset: availablePresets[prevIndex] });
            break;
          }
          case 'toggleRandomize':
            setSettings({ randomize: !settings.randomize });
            break;
        }
      }
    }
  }, [setSettings, settings.invert, settings.preset, settings.randomize, exportToPNG, loadOverlay, removeOverlay]);

  // Subscribe to MIDI messages
  useEffect(() => {
    const cleanup = onMidiMessage(handleMidiMessage);
    return cleanup;
  }, [onMidiMessage, handleMidiMessage]);

  // Use the renderer hook
  useAsciiRenderer(
    canvasRef,
    video,
    isReady,
    {
      fontId: fontIdLocal, // Use local state directly, not from fontSettings
      characters,
      randomize: Boolean(settings.randomize),
      randomSeed: Number(settings.randomSeed),
      mappingMode: settings.mappingMode as 'random' | 'gradient' | 'hue',
      gradientSeed: Number(settings.gradientSeed),
      hueSeed: Number(settings.hueSeed),
      resolution: Number(settings.resolution),
      aspectRatio: String(settings.aspectRatio),
      colorMode: settings.colorMode as 'monochrome' | 'colored',
      foregroundColor: String(settings.foregroundColor),
      backgroundColor: String(settings.backgroundColor),
      brightness: Number(settings.brightness),
      contrast: Number(settings.contrast),
      gamma: Number(settings.gamma),
      invert: Boolean(settings.invert),
      // Use synchronized values or fall back to current font's default range
      minAxis: minAxisValue,
      maxAxis: maxAxisValue,
      lineHeight: typeof fontSettingsAny.lineHeight === 'number' ? fontSettingsAny.lineHeight : 1.0,
      letterSpacing: typeof fontSettingsAny.letterSpacing === 'number' ? fontSettingsAny.letterSpacing : 1.0,
      overlay: overlay, // Pass overlay image to renderer
      paused: isPaused // Pass pause state to renderer
    }
  );

  // Handler for canvas click to toggle pause
  const handleCanvasClick = useCallback(() => {
    if (isReady) {
      setIsPaused(prev => !prev);
    }
  }, [isReady]);

  return (
    <div className="ascii-cam-container">
      {!hasStarted && (
        <div className="start-screen">
          <button className="start-button" onClick={startWebcam}>
            <span className="button-icon">📹</span>
            <span className="button-text">Start Camera</span>
          </button>
          <p className="start-hint">Made with ♥︎ and AI by <a href="http://eckert.io" target="_blank" rel="noopener noreferrer">Johannes Eckert</a>. <a href="https://github.com/johanneseckert/varitype-cam" target="_blank" rel="noopener noreferrer">Github</a></p>
        </div>
      )}

      {isLoading && (
        <div className="status-message loading">
          <div className="spinner"></div>
          <p>Requesting webcam access...</p>
        </div>
      )}

      {error && (
        <div className="status-message error">
          <p>⚠️ {error}</p>
          <p className="hint">Please allow webcam access to use this app</p>
        </div>
      )}

      {isReady && (
        <div
          className="canvas-wrapper"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onClick={handleCanvasClick}
        >
          <canvas
            ref={canvasRef}
            className="ascii-canvas"
          />
          {isHovering && (
            <div className="pause-overlay">
              <button className="pause-button">
                {isPaused ? (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                ) : (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


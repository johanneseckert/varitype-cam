import { useRef, useEffect, useMemo, useState } from 'react';
import { useControls, button, folder } from 'leva';
import { useWebcam } from '../hooks/useWebcam';
import { useAsciiRenderer } from '../hooks/useAsciiRenderer';
import { useImageExport, type ExportSettings } from '../hooks/useImageExport';
import { useImageOverlay } from '../hooks/useImageOverlay';
import { ASCII_PRESETS, PRESET_OPTIONS, type PresetName } from '../constants/asciiPresets';
import { FONTS, DEFAULT_FONT, type FontId } from '../constants/fonts';
import { getRandomChar, shuffleString } from '../utils/seededRandom';

interface AsciiCamProps {
  onCameraStart?: () => void;
}

export function AsciiCam({ onCameraStart }: AsciiCamProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { video, isReady, error, isLoading, hasStarted, startWebcam } = useWebcam();
  const { exportToPNG, exportToPNG4x } = useImageExport();
  const { overlay, loadOverlay, removeOverlay } = useImageOverlay();

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
  const settings = useControls({
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
        value: true,
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
        value: 'random' as 'random' | 'gradient' | 'hue',
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
          return chars.length > 1 && get('Character Set.mappingMode') === 'gradient';
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
          return chars.length > 1 && get('Character Set.mappingMode') === 'hue';
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
        value: 80,
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
      loadImage: button(() => loadOverlay(), { label: 'Load Image Overlay' }),
      removeImage: button(() => removeOverlay(), {
        label: 'Remove Overlay',
        disabled: !overlay
      })
    })
  });

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
            setFontIdLocal(next);
            // Force reset min/max values to new font's range
            const newFont = FONTS[next];
            setTimeout(() => {
              setFontSettings({ minAxis: newFont.primaryAxis.min });
              setFontSettings({ maxAxis: newFont.primaryAxis.max });
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
        ROND: {
          value: 0,
          min: 0,
          max: 100,
          step: 5,
          label: 'Roundness',
          render: () => fontIdLocal === 'doto'
        },
        MONO: {
          value: 1,
          min: 0,
          max: 1,
          step: 0.1,
          label: 'Monospace',
          render: () => fontIdLocal === 'sono'
        },
        SCAN: {
          value: 0,
          min: -53,
          max: 100,
          step: 1,
          label: 'Scanlines',
          render: () => fontIdLocal === 'sixtyfour' || fontIdLocal === 'workbench'
        },
        ELSH: {
          value: 0,
          min: 0,
          max: 100,
          step: 5,
          label: 'Shape',
          render: () => fontIdLocal === 'bitcount-grid-single'
        },
        ELXP: {
          value: 0,
          min: 0,
          max: 100,
          step: 5,
          label: 'Expansion',
          render: () => fontIdLocal === 'bitcount-grid-single'
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

  // Build secondary axes object from settings
  const secondaryAxes = useMemo(() => {
    const axes: Record<string, number> = {};
    const fontId = String((fontSettings as any).fontId);
    const selectedFont = FONTS[fontId as FontId];

    if (selectedFont?.secondaryAxes) {
      selectedFont.secondaryAxes.forEach(axis => {
        // Get value from the Font panel or use default
        const settingsValue = (fontSettings as any)[axis.name];
        axes[axis.name] = typeof settingsValue === 'number' ? settingsValue : (axis.default ?? axis.min);
      });
    }

    return Object.keys(axes).length > 0 ? axes : undefined;
  }, [fontSettings]);

  // Get current font to ensure min/max are always in sync
  const currentFont = FONTS[fontIdLocal] || FONTS[DEFAULT_FONT];

  // Check if fontSettings has been updated to match the current font
  // If not, use the font's default range to prevent mismatched axis values
  const settingsFontId = String((fontSettings as any)?.fontId || DEFAULT_FONT) as FontId;
  const isFontSettingsSynced = settingsFontId === fontIdLocal;

  const minAxisValue = isFontSettingsSynced && fontSettings?.minAxis
    ? Number(fontSettings.minAxis)
    : currentFont.primaryAxis.min;
  const maxAxisValue = isFontSettingsSynced && fontSettings?.maxAxis
    ? Number(fontSettings.maxAxis)
    : currentFont.primaryAxis.max;

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
    const letterSpacingValue = Number(fontSettings?.letterSpacing) || 1.0;
    const lineHeightValue = Number(fontSettings?.lineHeight) || 1.0;
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
  }, [settings.resolution, settings.aspectRatio, fontSettings?.lineHeight, fontSettings?.letterSpacing, fontIdLocal, video]);

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
    lineHeight: Number(fontSettings?.lineHeight) || 1.0,
    letterSpacing: Number(fontSettings?.letterSpacing) || 1.0,
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

  // Export controls (below Font)
  useControls('Export', {
    'Export PNG (1x)': button(() => exportToPNG(canvasRef.current)),
    'Export PNG (4x)': button(() => exportToPNG4x(exportSettings))
  }, { collapsed: true });

  // Use the renderer hook
  useAsciiRenderer(
    canvasRef,
    video,
    isReady,
    {
      fontId: fontIdLocal, // Use local state directly, not from fontSettings
      secondaryAxes,
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
      lineHeight: Number(fontSettings?.lineHeight) || 1.0,
      letterSpacing: Number(fontSettings?.letterSpacing) || 1.0,
      overlay: overlay // Pass overlay image to renderer
    }
  );

  return (
    <div className="ascii-cam-container">
      {!hasStarted && (
        <div className="start-screen">
          <button className="start-button" onClick={startWebcam}>
            <span className="button-icon">📹</span>
            <span className="button-text">Start Camera</span>
          </button>
          <p className="start-hint">Click to enable your webcam and begin</p>
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
        <canvas
          ref={canvasRef}
          className="ascii-canvas"
        />
      )}
    </div>
  );
}


import { useRef, useEffect, useMemo, useState } from 'react';
import { useControls, button, folder } from 'leva';
import { useWebcam } from '../hooks/useWebcam';
import { useAsciiRenderer } from '../hooks/useAsciiRenderer';
import { useImageExport } from '../hooks/useImageExport';
import { ASCII_PRESETS, PRESET_OPTIONS, type PresetName } from '../constants/asciiPresets';
import { FONTS, DEFAULT_FONT, type FontId } from '../constants/fonts';

interface AsciiCamProps {
  onCameraStart?: () => void;
}

export function AsciiCam({ onCameraStart }: AsciiCamProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { video, isReady, error, isLoading, hasStarted, startWebcam } = useWebcam();
  const { exportToPNG } = useImageExport();

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
        value: 'Single M' as PresetName,
        options: PRESET_OPTIONS,
        label: 'Preset'
      },
      customChars: {
        value: '',
        label: 'Custom Characters',
        render: (get) => get('Character Set.preset') === 'Custom'
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
          return chars.length > 1;
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
          return chars.length > 1 && get('Character Set.mappingMode') === 'random';
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
        value: 'Auto',
        options: ['Auto', '16:9', '4:3', '1:1'],
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

    'Export': folder({
      exportPNG: button(() => exportToPNG(canvasRef.current))
    }, { collapsed: true })
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
        BACK: {
          value: 200,
          min: 1,
          max: 900,
          step: 10,
          label: 'Background',
          render: () => fontIdLocal === 'gridlite-pe'
        },
        RECT: {
          value: 200,
          min: 1,
          max: 900,
          step: 10,
          label: 'Rectangle',
          render: () => fontIdLocal === 'gridlite-pe'
        },
        ELSH: {
          value: 3,
          min: 1,
          max: 4,
          step: 1,
          label: 'Shape',
          render: () => fontIdLocal === 'gridlite-pe'
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
    const fontId = String(fontSettings.fontId);
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

  // Use the renderer hook
  useAsciiRenderer(
    canvasRef,
    video,
    isReady,
    {
      fontId: String(fontSettings?.fontId || DEFAULT_FONT) as FontId,
      secondaryAxes,
      characters,
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
      minAxis: Number(fontSettings?.minAxis) || 100,
      maxAxis: Number(fontSettings?.maxAxis) || 900,
      lineHeight: Number(fontSettings?.lineHeight) || 1.0,
      letterSpacing: Number(fontSettings?.letterSpacing) || 1.0
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


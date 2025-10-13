import { useRef, useEffect, useMemo } from 'react';
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

  // Build dynamic font controls based on all possible secondary axes
  const fontControls = useMemo(() => {
    const controls: any = {
      fontId: {
        value: DEFAULT_FONT,
        options: fontOptions,
        label: 'Font Family'
      },
      minAxis: {
        value: 100,
        min: 1,
        max: 2050,
        step: 10,
        label: 'Min Axis (dark)'
      },
      maxAxis: {
        value: 900,
        min: 1,
        max: 2050,
        step: 10,
        label: 'Max Axis (bright)'
      }
    };

    // Add secondary axis controls for Gridlite PE (conditionally rendered)
    controls.BACK = {
      value: 200,
      min: 1,
      max: 900,
      step: 10,
      label: 'Background',
      render: (get: any) => get('Font.fontId') === 'gridlite-pe'
    };
    controls.RECT = {
      value: 200,
      min: 1,
      max: 900,
      step: 10,
      label: 'Rectangle',
      render: (get: any) => get('Font.fontId') === 'gridlite-pe'
    };
    controls.ELSH = {
      value: 3,
      min: 1,
      max: 4,
      step: 1,
      label: 'Shape',
      render: (get: any) => get('Font.fontId') === 'gridlite-pe'
    };

    // Add spacing controls at the end
    controls.lineHeight = {
      value: 1.0,
      min: 0.6,
      max: 1.6,
      step: 0.1,
      label: 'Line Height'
    };
    controls.letterSpacing = {
      value: 1.0,
      min: 0.6,
      max: 1.6,
      step: 0.1,
      label: 'Letter Spacing'
    };

    return controls;
  }, [fontOptions]);

  // Leva controls
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

    'Font': folder(fontControls),

    'Export': folder({
      exportPNG: button(() => exportToPNG(canvasRef.current))
    }, { collapsed: true })
  });

  // Determine which characters to use
  const characters = settings.preset === 'Custom'
    ? settings.customChars || 'M'
    : ASCII_PRESETS[settings.preset];

  // Build secondary axes object from settings
  const secondaryAxes = useMemo(() => {
    const axes: Record<string, number> = {};
    const fontId = String(settings.fontId);
    const selectedFont = FONTS[fontId as FontId];

    if (selectedFont?.secondaryAxes) {
      selectedFont.secondaryAxes.forEach(axis => {
        // Get value from settings or use default
        const settingsValue = (settings as any)[axis.name];
        axes[axis.name] = typeof settingsValue === 'number' ? settingsValue : (axis.default ?? axis.min);
      });
    }

    return Object.keys(axes).length > 0 ? axes : undefined;
  }, [settings]);

  // Use the renderer hook
  useAsciiRenderer(canvasRef, video, isReady, {
    fontId: String(settings.fontId) as FontId,
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
    minAxis: Number(settings.minAxis),
    maxAxis: Number(settings.maxAxis),
    lineHeight: Number(settings.lineHeight),
    letterSpacing: Number(settings.letterSpacing)
  });

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


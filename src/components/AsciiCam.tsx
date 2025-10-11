import { useRef, useEffect } from 'react';
import { useControls, button, folder } from 'leva';
import { useWebcam } from '../hooks/useWebcam';
import { useAsciiRenderer } from '../hooks/useAsciiRenderer';
import { useImageExport } from '../hooks/useImageExport';
import { ASCII_PRESETS, PRESET_OPTIONS, type PresetName } from '../constants/asciiPresets';

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
        value: 'random' as 'random' | 'gradient',
        options: {
          'Random Position': 'random',
          'Luminance Gradient': 'gradient'
        },
        label: 'Mapping Mode',
        render: (get) => {
          const preset = get('Character Set.preset');
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
          const preset = get('Character Set.preset');
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
          const preset = get('Character Set.preset');
          const chars = preset === 'Custom'
            ? get('Character Set.customChars')
            : ASCII_PRESETS[preset];
          return chars.length > 1 && get('Character Set.mappingMode') === 'random';
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

    'Font': folder({
      minWeight: {
        value: 100,
        min: 100,
        max: 900,
        step: 50,
        label: 'Min Weight (dark)'
      },
      maxWeight: {
        value: 900,
        min: 100,
        max: 900,
        step: 50,
        label: 'Max Weight (bright)'
      },
      lineHeight: {
        value: 1.0,
        min: 0.5,
        max: 2.0,
        step: 0.05,
        label: 'Line Height'
      }
    }),

    'Export': folder({
      exportPNG: button(() => exportToPNG(canvasRef.current), {
        label: '📸 Export PNG'
      })
    }, { collapsed: true })
  });

  // Determine which characters to use
  const characters = settings.preset === 'Custom'
    ? settings.customChars || 'M'
    : ASCII_PRESETS[settings.preset];

  // Use the renderer hook
  useAsciiRenderer(canvasRef, video, isReady, {
    characters,
    randomSeed: settings.randomSeed,
    mappingMode: settings.mappingMode,
    gradientSeed: settings.gradientSeed,
    resolution: settings.resolution,
    aspectRatio: settings.aspectRatio,
    colorMode: settings.colorMode,
    foregroundColor: settings.foregroundColor,
    backgroundColor: settings.backgroundColor,
    brightness: settings.brightness,
    contrast: settings.contrast,
    gamma: settings.gamma,
    invert: settings.invert,
    minWeight: settings.minWeight,
    maxWeight: settings.maxWeight,
    lineHeight: settings.lineHeight
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


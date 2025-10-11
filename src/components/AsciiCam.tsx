import { useRef } from 'react';
import { useControls, button, folder } from 'leva';
import { useWebcam } from '../hooks/useWebcam';
import { useAsciiRenderer } from '../hooks/useAsciiRenderer';
import { useImageExport } from '../hooks/useImageExport';
import { ASCII_PRESETS, PRESET_OPTIONS, type PresetName } from '../constants/asciiPresets';

export function AsciiCam() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { video, isReady, error, isLoading, hasStarted, startWebcam } = useWebcam();
  const { exportToPNG } = useImageExport();

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
      randomSeed: {
        value: 12345,
        min: 0,
        max: 999999,
        step: 1,
        label: 'Random Seed',
        render: (get) => {
          const preset = get('Character Set.preset');
          const chars = preset === 'Custom'
            ? get('Character Set.customChars')
            : ASCII_PRESETS[preset];
          return chars.length > 1 && get('Character Set.mappingMode') === 'random';
        }
      },
      regenerate: button(() => {
        // Generate new random seed
        const newSeed = Math.floor(Math.random() * 999999);
        settings.randomSeed = newSeed;
      }, {
        label: '🎲 Shuffle',
        render: (get) => {
          const preset = get('Character Set.preset');
          const chars = preset === 'Custom'
            ? get('Character Set.customChars')
            : ASCII_PRESETS[preset];
          return chars.length > 1 && get('Character Set.mappingMode') === 'random';
        }
      }),
      gradientSeed: {
        value: 54321,
        min: 0,
        max: 999999,
        step: 1,
        label: 'Gradient Order',
        render: (get) => {
          const preset = get('Character Set.preset');
          const chars = preset === 'Custom'
            ? get('Character Set.customChars')
            : ASCII_PRESETS[preset];
          return chars.length > 1 && get('Character Set.mappingMode') === 'gradient';
        }
      },
      regenerateGradient: button(() => {
        // Generate new gradient seed
        const newSeed = Math.floor(Math.random() * 999999);
        settings.gradientSeed = newSeed;
      }, {
        label: '🎲 Shuffle Gradient',
        render: (get) => {
          const preset = get('Character Set.preset');
          const chars = preset === 'Custom'
            ? get('Character Set.customChars')
            : ASCII_PRESETS[preset];
          return chars.length > 1 && get('Character Set.mappingMode') === 'gradient';
        }
      })
    }),

    'Appearance': folder({
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
      },
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
      invert: {
        value: false,
        label: 'Invert'
      }
    }),

    'Grid': folder({
      aspectRatio: {
        value: '16:9',
        options: ['16:9', '4:3', '1:1'],
        label: 'Aspect Ratio'
      },
      resolution: {
        value: 100,
        min: 20,
        max: 200,
        step: 1,
        label: 'Resolution (chars wide)'
      },
      fontSize: {
        value: 16,
        min: 8,
        max: 40,
        step: 1,
        label: 'Font Size (px)'
      }
    }),

    'Weight Mapping': folder({
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
      }
    }),

    'Export': folder({
      exportPNG: button(() => exportToPNG(canvasRef.current), {
        label: '📸 Export PNG'
      })
    })
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
    fontSize: settings.fontSize,
    aspectRatio: settings.aspectRatio,
    colorMode: settings.colorMode,
    foregroundColor: settings.foregroundColor,
    backgroundColor: settings.backgroundColor,
    brightness: settings.brightness,
    contrast: settings.contrast,
    invert: settings.invert,
    minWeight: settings.minWeight,
    maxWeight: settings.maxWeight
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


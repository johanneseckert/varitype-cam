import { useEffect, useRef } from 'react';
import {
  samplePixel,
  applyBrightness,
  applyContrast,
  mapToFontWeight
} from '../utils/luminance';
import { getRandomChar } from '../utils/seededRandom';

export interface RenderSettings {
  // Character settings
  characters: string;
  randomSeed: number;

  // Grid settings
  resolution: number;
  fontSize: number;
  aspectRatio: string;

  // Appearance settings
  colorMode: 'monochrome' | 'colored';
  foregroundColor: string;
  backgroundColor: string;
  brightness: number;
  contrast: number;
  invert: boolean;

  // Weight mapping
  minWeight: number;
  maxWeight: number;
}

export function useAsciiRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  video: HTMLVideoElement | null,
  isVideoReady: boolean,
  settings: RenderSettings
) {
  const animationFrameRef = useRef<number | undefined>(undefined);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tempCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !video || !isVideoReady) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Create temp canvas for video sampling if needed
    if (!tempCanvasRef.current) {
      tempCanvasRef.current = document.createElement('canvas');
      tempCtxRef.current = tempCanvasRef.current.getContext('2d', {
        willReadFrequently: true,
        alpha: false
      });
    }

    const tempCanvas = tempCanvasRef.current;
    const tempCtx = tempCtxRef.current;
    if (!tempCtx) return;

    // Calculate grid dimensions based on aspect ratio
    const getGridDimensions = () => {
      const width = settings.resolution;
      let height: number;

      switch (settings.aspectRatio) {
        case '4:3':
          height = Math.round(width * (3 / 4));
          break;
        case '1:1':
          height = width;
          break;
        case '16:9':
        default:
          height = Math.round(width * (9 / 16));
          break;
      }

      return { cols: width, rows: height };
    };

    const render = () => {
      const { cols, rows } = getGridDimensions();

      // Calculate canvas size based on font size
      const charWidth = settings.fontSize * 0.6; // Monospace approximation
      const charHeight = settings.fontSize;

      canvas.width = cols * charWidth;
      canvas.height = rows * charHeight;

      // Fill background
      ctx.fillStyle = settings.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Setup text rendering
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Sample video dimensions
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      if (videoWidth === 0 || videoHeight === 0) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Render each character
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Calculate video sample position
          const videoX = (col / cols) * videoWidth;
          const videoY = (row / rows) * videoHeight;

          // Sample pixel
          const pixel = samplePixel(
            video,
            tempCanvas,
            tempCtx,
            videoX,
            videoY,
            videoWidth,
            videoHeight
          );

          // Apply filters
          let luminance = pixel.luminance;
          luminance = applyBrightness(luminance, settings.brightness);
          luminance = applyContrast(luminance, settings.contrast);

          if (settings.invert) {
            luminance = 255 - luminance;
          }

          // Map to font weight
          const fontWeight = mapToFontWeight(
            luminance,
            settings.minWeight,
            settings.maxWeight
          );

          // Select character
          const position = row * cols + col;
          const char = settings.characters.length > 1
            ? getRandomChar(settings.characters, settings.randomSeed, position)
            : (settings.characters || 'M');

          // Set color
          if (settings.colorMode === 'colored') {
            ctx.fillStyle = `rgb(${pixel.r}, ${pixel.g}, ${pixel.b})`;
          } else {
            ctx.fillStyle = settings.foregroundColor;
          }

          // Set font with variable weight
          ctx.font = `${fontWeight} ${settings.fontSize}px 'Geist Mono Variable', monospace`;

          // Draw character
          const x = col * charWidth + charWidth / 2;
          const y = row * charHeight + charHeight / 2;
          ctx.fillText(char, x, y);
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [canvasRef, video, isVideoReady, settings]);
}


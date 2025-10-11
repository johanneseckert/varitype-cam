import { useEffect, useRef, useMemo } from 'react';
import {
  sampleVideoFrame,
  getPixelFromImageData,
  applyBrightness,
  applyContrast,
  mapToFontWeight
} from '../utils/luminance';
import { getRandomChar, getCharByLuminance, shuffleString } from '../utils/seededRandom';

export interface RenderSettings {
  // Character settings
  characters: string;
  randomSeed: number;
  mappingMode: 'random' | 'gradient';
  gradientSeed: number;

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
  const lastFrameTime = useRef<number>(0);
  const fpsInterval = 1000 / 30; // Target 30 FPS

  // Memoize grid dimensions and canvas size
  const gridDimensions = useMemo(() => {
    // Character aspect ratio (monospace chars are typically ~0.6 width/height ratio)
    const charAspectRatio = 0.6;

    // Get target canvas aspect ratio
    let targetAspectRatio: number;
    switch (settings.aspectRatio) {
      case '4:3':
        targetAspectRatio = 4 / 3;
        break;
      case '1:1':
        targetAspectRatio = 1;
        break;
      case '16:9':
      default:
        targetAspectRatio = 16 / 9;
        break;
    }

    // Start with resolution as width (in characters)
    const cols = settings.resolution;

    // Calculate rows needed to maintain aspect ratio, accounting for character shape
    // canvasWidth / canvasHeight = targetAspectRatio
    // (cols * charWidth) / (rows * charHeight) = targetAspectRatio
    // Since charWidth/charHeight = charAspectRatio:
    // (cols * charAspectRatio) / rows = targetAspectRatio
    // rows = (cols * charAspectRatio) / targetAspectRatio
    const rows = Math.round((cols * charAspectRatio) / targetAspectRatio);

    // Calculate actual canvas dimensions
    const charWidth = settings.fontSize * charAspectRatio;
    const charHeight = settings.fontSize;
    const canvasWidth = cols * charWidth;
    const canvasHeight = rows * charHeight;

    return {
      cols,
      rows,
      canvasWidth,
      canvasHeight,
      charWidth,
      charHeight
    };
  }, [settings.resolution, settings.aspectRatio, settings.fontSize]);

  // Pre-generate character lookup table (only for random mode)
  const charLookup = useMemo(() => {
    if (settings.characters.length <= 1 || settings.mappingMode !== 'random') return null;

    const { cols, rows } = gridDimensions;
    const total = cols * rows;
    const chars = new Array(total);

    for (let i = 0; i < total; i++) {
      chars[i] = getRandomChar(settings.characters, settings.randomSeed, i);
    }

    return chars;
  }, [settings.characters, settings.randomSeed, settings.mappingMode, gridDimensions]);

  // Shuffled character string for gradient mode
  const gradientChars = useMemo(() => {
    if (settings.characters.length <= 1 || settings.mappingMode !== 'gradient') return settings.characters;
    return shuffleString(settings.characters, settings.gradientSeed);
  }, [settings.characters, settings.gradientSeed, settings.mappingMode]);

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

    const { cols, rows, canvasWidth, canvasHeight, charWidth, charHeight } = gridDimensions;

    // Only resize canvas if dimensions changed
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }

    // Pre-set text rendering properties
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const render = (currentTime: number) => {
      // Frame rate limiting
      const elapsed = currentTime - lastFrameTime.current;

      if (elapsed < fpsInterval) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      lastFrameTime.current = currentTime - (elapsed % fpsInterval);

      // Check video dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Fill background
      ctx.fillStyle = settings.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Sample entire frame at once (at grid resolution for speed!)
      const imageData = sampleVideoFrame(video, tempCanvas, tempCtx, cols, rows);

      // Cache repeated values
      const useMultipleChars = settings.characters.length > 1;
      const singleChar = settings.characters || 'M';
      const isColored = settings.colorMode === 'colored';
      const isGradientMode = settings.mappingMode === 'gradient';
      const { brightness, contrast, invert, minWeight, maxWeight, foregroundColor } = settings;

      // Render each character
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Get pixel from pre-sampled image data
          const pixel = getPixelFromImageData(imageData, col, row, cols);

          // Apply filters
          let luminance = pixel.luminance;
          luminance = applyBrightness(luminance, brightness);
          luminance = applyContrast(luminance, contrast);

          if (invert) {
            luminance = 255 - luminance;
          }

          // Map to font weight
          const fontWeight = mapToFontWeight(luminance, minWeight, maxWeight);

          // Select character based on mapping mode
          let char: string;
          if (!useMultipleChars) {
            char = singleChar;
          } else if (isGradientMode) {
            // Gradient mode: map luminance to character
            char = getCharByLuminance(gradientChars, luminance);
          } else {
            // Random mode: use pre-generated lookup
            const position = row * cols + col;
            char = charLookup ? charLookup[position] : singleChar;
          }

          // Set color
          if (isColored) {
            ctx.fillStyle = `rgb(${pixel.r},${pixel.g},${pixel.b})`;
          } else {
            ctx.fillStyle = foregroundColor;
          }

          // Set font with variable weight
          ctx.font = `${fontWeight} ${settings.fontSize}px 'Geist Mono Variable',monospace`;

          // Draw character
          const x = col * charWidth + charWidth / 2;
          const y = row * charHeight + charHeight / 2;
          ctx.fillText(char, x, y);
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [canvasRef, video, isVideoReady, settings, gridDimensions, charLookup, gradientChars]);
}


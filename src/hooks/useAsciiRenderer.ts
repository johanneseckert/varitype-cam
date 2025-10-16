import { useEffect, useRef, useMemo } from 'react';
import {
  sampleVideoFrame,
  getPixelFromImageData,
  applyBrightness,
  applyContrast,
  applyGamma,
  mapToFontAxis
} from '../utils/luminance';
import { getRandomChar, getCharByLuminance, getCharByHue, shuffleString } from '../utils/seededRandom';
import { FONTS, DEFAULT_FONT, type FontId } from '../constants/fonts';

export interface RenderSettings {
  // Font settings
  fontId: FontId;
  secondaryAxes?: Record<string, number>; // Dynamic secondary axis values

  // Character settings
  characters: string;
  randomSeed: number;
  mappingMode: 'random' | 'gradient' | 'hue';
  gradientSeed: number;
  hueSeed: number;

  // Grid settings
  resolution: number;
  aspectRatio: string;

  // Appearance settings
  colorMode: 'monochrome' | 'colored';
  foregroundColor: string;
  backgroundColor: string;
  brightness: number;
  contrast: number;
  gamma: number;
  invert: boolean;

  // Primary axis mapping (luminance-driven)
  minAxis: number;
  maxAxis: number;
  lineHeight: number;
  letterSpacing: number;
}

export function useAsciiRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
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
    // Get font configuration
    const font = FONTS[settings.fontId] || FONTS[DEFAULT_FONT];
    const charAspectRatio = font.charAspectRatio;

    // Target canvas size (adjust based on viewport, but keep it reasonable)
    const targetCanvasWidth = Math.min(window.innerWidth * 0.8, 1600);

    // Get target canvas aspect ratio
    let targetAspectRatio: number;

    if (settings.aspectRatio === 'Auto' && video) {
      // Use webcam's native aspect ratio
      const videoAspect = video.videoWidth / video.videoHeight;
      targetAspectRatio = videoAspect;
    } else {
      switch (settings.aspectRatio) {
        case '4:3':
          targetAspectRatio = 4 / 3;
          break;
        case '1:1':
          targetAspectRatio = 1;
          break;
        case '16:9':
          targetAspectRatio = 16 / 9;
          break;
        default:
          // Fallback to 16:9
          targetAspectRatio = 16 / 9;
          break;
      }
    }

    // Start with resolution as width (in characters)
    const baseCols = settings.resolution;

    // Calculate font size based on base resolution
    // canvasWidth = cols * charWidth = cols * fontSize * charAspectRatio
    // fontSize = targetCanvasWidth / (cols * charAspectRatio)
    const fontSize = targetCanvasWidth / (baseCols * charAspectRatio);

    // Calculate canvas dimensions first (maintaining aspect ratio)
    const baseFontSize = fontSize;

    // Apply letter spacing - affects how much horizontal space each character takes
    const charWidth = baseFontSize * charAspectRatio * settings.letterSpacing;

    // Calculate how many columns fit in the target width with letter spacing
    const canvasWidth = targetCanvasWidth;
    const cols = Math.floor(canvasWidth / charWidth);

    // Calculate target canvas height based on aspect ratio
    const canvasHeight = canvasWidth / targetAspectRatio;

    // Now calculate how many rows fit in this height given the line height
    // Each row takes up (fontSize × lineHeight) vertical space
    const rowHeight = baseFontSize * settings.lineHeight;
    const rows = Math.floor(canvasHeight / rowHeight);

    return {
      cols,
      rows,
      canvasWidth,
      canvasHeight,
      charWidth,
      charHeight: rowHeight, // Use row height for character spacing
      fontSize: baseFontSize
    };
  }, [settings.resolution, settings.aspectRatio, settings.lineHeight, settings.letterSpacing, settings.fontId, video]);

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

  // Shuffled character string for gradient modes
  const gradientChars = useMemo(() => {
    if (settings.characters.length <= 1 || (settings.mappingMode !== 'gradient' && settings.mappingMode !== 'hue')) {
      return settings.characters;
    }
    const seed = settings.mappingMode === 'hue' ? settings.hueSeed : settings.gradientSeed;
    return shuffleString(settings.characters, seed);
  }, [settings.characters, settings.gradientSeed, settings.hueSeed, settings.mappingMode]);

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

    const { cols, rows, canvasWidth, canvasHeight, charWidth, charHeight, fontSize } = gridDimensions;

    // Validate grid dimensions - bail if invalid
    if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols <= 0 || rows <= 0) {
      return;
    }

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

      // Calculate canvas aspect ratio (accounting for character width)
      const canvasAspectRatio = canvasWidth / canvasHeight;

      // Sample entire frame at once (at grid resolution for speed!)
      const imageData = sampleVideoFrame(video, tempCanvas, tempCtx, cols, rows, canvasAspectRatio);

      // Cache repeated values
      const useMultipleChars = settings.characters.length > 1;
      const singleChar = settings.characters || 'M';
      const isColored = settings.colorMode === 'colored';
      const isGradientMode = settings.mappingMode === 'gradient';
      const isHueMode = settings.mappingMode === 'hue';
      const { brightness, contrast, gamma, invert, minAxis, maxAxis, foregroundColor } = settings;

      // Render each character
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Get pixel from pre-sampled image data
          const pixel = getPixelFromImageData(imageData, col, row, cols);

          // Apply filters in order: gamma -> brightness -> contrast -> invert
          let luminance = pixel.luminance;
          luminance = applyGamma(luminance, gamma);
          luminance = applyBrightness(luminance, brightness);
          luminance = applyContrast(luminance, contrast);

          if (invert) {
            luminance = 255 - luminance;
          }

          // Get font configuration
          const font = FONTS[settings.fontId] || FONTS[DEFAULT_FONT];

          // Map to primary axis value (luminance-driven)
          const primaryAxisValue = mapToFontAxis(luminance, minAxis, maxAxis);

          // Select character based on mapping mode
          let char: string;
          if (!useMultipleChars) {
            char = singleChar;
          } else if (isHueMode) {
            // Hue mode: map hue from video to character
            char = getCharByHue(gradientChars, pixel.hue);
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

          // Set font with variable axes
          // Build font-variation-settings string for all axes
          const fontVariationParts: string[] = [];

          // Add primary axis (luminance-driven)
          fontVariationParts.push(`'${font.primaryAxis.name}' ${primaryAxisValue}`);

          // Add secondary axes (user-controlled) if present
          if (font.secondaryAxes && settings.secondaryAxes) {
            font.secondaryAxes.forEach(axis => {
              const value = settings.secondaryAxes?.[axis.name] ?? axis.default ?? axis.min;
              fontVariationParts.push(`'${axis.name}' ${value}`);
            });
          }

          const fontVariationSettings = fontVariationParts.join(', ');

          // For canvas, if primary axis is 'wght', we can use numeric weight in font property
          // Other axes need font-variation-settings (limited browser support in canvas)
          if (font.primaryAxis.name === 'wght') {
            ctx.font = `${primaryAxisValue} ${fontSize}px '${font.family}', monospace`;
          } else {
            ctx.font = `${fontSize}px '${font.family}', monospace`;
          }

          // Note: Canvas 2D has limited support for font-variation-settings
          // Some browsers may not render non-weight axes correctly
          if (fontVariationParts.length > 1) {
            // @ts-ignore - font-variation-settings is not in TS types but works in some browsers
            ctx.fontVariationSettings = fontVariationSettings;
          }

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


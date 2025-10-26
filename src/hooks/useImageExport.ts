import { useCallback } from 'react';
import {
  sampleVideoFrame,
  getPixelFromImageData,
  applyBrightness,
  applyContrast,
  applyGamma,
  mapToFontAxis
} from '../utils/luminance';
import { getRandomChar, getCharByLuminance, getCharByHue } from '../utils/seededRandom';
import { FONTS, DEFAULT_FONT, type FontId } from '../constants/fonts';

export interface ExportSettings {
  // Video source
  video: HTMLVideoElement | null;
  overlay: HTMLImageElement | null;

  // Font settings
  fontId: FontId;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;

  // Character settings
  characters: string;
  charLookup: string[] | null; // Pre-generated for random mode
  gradientChars: string; // Shuffled for gradient/hue modes
  randomize: boolean;
  mappingMode: 'random' | 'gradient' | 'hue';

  // Grid dimensions
  cols: number;
  rows: number;
  canvasWidth: number;
  canvasHeight: number;
  charWidth: number;
  charHeight: number;

  // Appearance settings
  colorMode: 'monochrome' | 'colored';
  foregroundColor: string;
  backgroundColor: string;

  // Video filters
  brightness: number;
  contrast: number;
  gamma: number;
  invert: boolean;

  // Font axis mapping
  minAxis: number;
  maxAxis: number;
}

export function useImageExport() {
  const exportToPNG = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) {
      console.error('No canvas available for export');
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to create blob from canvas');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

      link.download = `ascii-cam-1x-${timestamp}.png`;
      link.href = url;
      link.click();

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }, 'image/png');
  }, []);

  const exportToPNG4x = useCallback((settings: ExportSettings) => {
    const { video, overlay } = settings;

    if (!video) {
      console.error('No video available for export');
      return;
    }

    console.log('[Export 4x] Starting high-resolution export...');

    // Create high-res canvas at 4x scale
    const scale = 4;
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d', { alpha: false });

    if (!exportCtx) {
      console.error('Failed to create export canvas context');
      return;
    }

    // Set canvas size to 4x
    exportCanvas.width = settings.canvasWidth * scale;
    exportCanvas.height = settings.canvasHeight * scale;

    // Create temp canvas for video sampling
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', {
      willReadFrequently: true,
      alpha: false
    });

    if (!tempCtx) {
      console.error('Failed to create temp canvas context');
      return;
    }

    // Fill background
    exportCtx.fillStyle = settings.backgroundColor;
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Calculate canvas aspect ratio
    const canvasAspectRatio = settings.canvasWidth / settings.canvasHeight;

    // Sample video frame (at same grid resolution, not scaled)
    const imageData = sampleVideoFrame(
      video,
      tempCanvas,
      tempCtx,
      settings.cols,
      settings.rows,
      canvasAspectRatio,
      overlay
    );

    // Set text rendering properties
    exportCtx.textAlign = 'center';
    exportCtx.textBaseline = 'middle';

    // Scale up font size and character dimensions
    const scaledFontSize = settings.fontSize * scale;
    const scaledCharWidth = settings.charWidth * scale;
    const scaledCharHeight = settings.charHeight * scale;

    // Get font configuration
    const font = FONTS[settings.fontId] || FONTS[DEFAULT_FONT];

    // Cache repeated values
    const useMultipleChars = settings.characters.length > 1;
    const singleChar = settings.characters || 'M';
    const isColored = settings.colorMode === 'colored';
    const isGradientMode = settings.mappingMode === 'gradient';
    const isHueMode = settings.mappingMode === 'hue';
    const useRandomize = settings.randomize;

    // Render each character at 4x scale
    for (let row = 0; row < settings.rows; row++) {
      for (let col = 0; col < settings.cols; col++) {
        // Get pixel from pre-sampled image data
        const pixel = getPixelFromImageData(imageData, col, row, settings.cols);

        // Select character based on mapping mode and randomize setting
        let char: string;
        if (!useMultipleChars) {
          char = singleChar;
        } else if (!useRandomize) {
          // Sequential looping mode - just loop through characters in order
          const position = row * settings.cols + col;
          char = settings.characters[position % settings.characters.length];
        } else if (isHueMode) {
          char = getCharByHue(settings.gradientChars, pixel.hue);
        } else if (isGradientMode) {
          char = getCharByLuminance(settings.gradientChars, pixel.luminance);
        } else {
          // Random mode: use pre-generated lookup
          const position = row * settings.cols + col;
          char = settings.charLookup ? settings.charLookup[position] : singleChar;
        }

        // Apply filters to luminance for font weight
        let luminance = pixel.luminance;
        luminance = applyGamma(luminance, settings.gamma);
        luminance = applyBrightness(luminance, settings.brightness);
        luminance = applyContrast(luminance, settings.contrast);

        if (settings.invert) {
          luminance = 255 - luminance;
        }

        // Map luminance to primary axis value
        const primaryAxisValue = mapToFontAxis(luminance, settings.minAxis, settings.maxAxis);

        // Save context state
        exportCtx.save();

        // Set font (only weight axis supported in Canvas 2D)
        if (font.primaryAxis.name === 'wght') {
          const weight = primaryAxisValue;
          const fontString = `normal ${weight} ${scaledFontSize}px '${font.family}'`;
          exportCtx.font = fontString;
        } else {
          const fontString = `normal 400 ${scaledFontSize}px '${font.family}'`;
          exportCtx.font = fontString;
        }

        // Set color
        if (isColored) {
          exportCtx.fillStyle = `rgb(${pixel.r},${pixel.g},${pixel.b})`;
        } else {
          exportCtx.fillStyle = settings.foregroundColor;
        }

        // Draw character at scaled position
        const x = col * scaledCharWidth + scaledCharWidth / 2;
        const y = row * scaledCharHeight + scaledCharHeight / 2;
        exportCtx.fillText(char, x, y);

        // Restore context state
        exportCtx.restore();
      }
    }

    console.log('[Export 4x] Rendering complete, creating download...');

    // Export the high-res canvas
    exportCanvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to create blob from export canvas');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

      link.download = `ascii-cam-4x-${timestamp}.png`;
      link.href = url;
      link.click();

      console.log('[Export 4x] Download initiated');

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }, 'image/png');
  }, []);

  return { exportToPNG, exportToPNG4x };
}

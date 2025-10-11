/**
 * Calculate relative luminance from RGB values
 * Using the standard formula: 0.299*R + 0.587*G + 0.114*B
 */
export function calculateLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Apply brightness adjustment to luminance value
 * @param luminance - Original luminance (0-255)
 * @param brightness - Brightness adjustment (-100 to 100)
 */
export function applyBrightness(luminance: number, brightness: number): number {
  return Math.max(0, Math.min(255, luminance + brightness * 2.55));
}

/**
 * Apply contrast adjustment to luminance value
 * @param luminance - Original luminance (0-255)
 * @param contrast - Contrast multiplier (0 to 200, 100 is neutral)
 */
export function applyContrast(luminance: number, contrast: number): number {
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  return Math.max(0, Math.min(255, factor * (luminance - 128) + 128));
}

/**
 * Map luminance value (0-255) to font weight (min-max)
 */
export function mapToFontWeight(
  luminance: number,
  minWeight: number,
  maxWeight: number
): number {
  const normalized = luminance / 255;
  return Math.round(minWeight + normalized * (maxWeight - minWeight));
}

/**
 * Sample entire video frame at once for better performance
 */
export function sampleVideoFrame(
  videoElement: HTMLVideoElement,
  tempCanvas: HTMLCanvasElement,
  tempCtx: CanvasRenderingContext2D,
  cols: number,
  rows: number
): ImageData {
  // Resize temp canvas to match grid resolution (much smaller!)
  if (tempCanvas.width !== cols || tempCanvas.height !== rows) {
    tempCanvas.width = cols;
    tempCanvas.height = rows;
  }

  // Draw video scaled down to grid resolution
  tempCtx.drawImage(videoElement, 0, 0, cols, rows);

  // Get all pixel data at once
  return tempCtx.getImageData(0, 0, cols, rows);
}

/**
 * Get pixel data from ImageData at a specific grid position
 */
export function getPixelFromImageData(
  imageData: ImageData,
  col: number,
  row: number,
  cols: number
): { r: number; g: number; b: number; luminance: number } {
  const index = (row * cols + col) * 4;
  const r = imageData.data[index];
  const g = imageData.data[index + 1];
  const b = imageData.data[index + 2];

  return {
    r,
    g,
    b,
    luminance: calculateLuminance(r, g, b)
  };
}


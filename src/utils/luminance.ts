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
 * Sample pixel data from a video frame at a specific position
 */
export function samplePixel(
  videoElement: HTMLVideoElement,
  tempCanvas: HTMLCanvasElement,
  tempCtx: CanvasRenderingContext2D,
  x: number,
  y: number,
  videoWidth: number,
  videoHeight: number
): { r: number; g: number; b: number; luminance: number } {
  // Draw the current video frame to the temp canvas
  if (tempCanvas.width !== videoWidth || tempCanvas.height !== videoHeight) {
    tempCanvas.width = videoWidth;
    tempCanvas.height = videoHeight;
  }

  tempCtx.drawImage(videoElement, 0, 0, videoWidth, videoHeight);

  // Get pixel data
  const imageData = tempCtx.getImageData(
    Math.floor(x),
    Math.floor(y),
    1,
    1
  ).data;

  const r = imageData[0];
  const g = imageData[1];
  const b = imageData[2];

  return {
    r,
    g,
    b,
    luminance: calculateLuminance(r, g, b)
  };
}


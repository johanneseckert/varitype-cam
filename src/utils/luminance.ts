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
 * Apply gamma correction to luminance value
 * @param luminance - Original luminance (0-255)
 * @param gamma - Gamma value (0.1 to 3.0, 1.0 is neutral)
 */
export function applyGamma(luminance: number, gamma: number): number {
  // Normalize to 0-1, apply gamma, then scale back to 0-255
  const normalized = luminance / 255;
  const corrected = Math.pow(normalized, 1 / gamma);
  return Math.max(0, Math.min(255, corrected * 255));
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
 * Uses "cover" fitting - video is never stretched, but may be cropped
 */
export function sampleVideoFrame(
  videoElement: HTMLVideoElement,
  tempCanvas: HTMLCanvasElement,
  tempCtx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  canvasAspectRatio: number
): ImageData {
  // Resize temp canvas to match grid resolution (much smaller!)
  if (tempCanvas.width !== cols || tempCanvas.height !== rows) {
    tempCanvas.width = cols;
    tempCanvas.height = rows;
  }

  // Calculate video aspect ratio
  const videoWidth = videoElement.videoWidth;
  const videoHeight = videoElement.videoHeight;
  const videoAspect = videoWidth / videoHeight;

  // Calculate source rectangle for "cover" fitting
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = videoWidth;
  let sourceHeight = videoHeight;

  if (Math.abs(videoAspect - canvasAspectRatio) > 0.01) {
    // Aspect ratios don't match - need to crop
    if (videoAspect > canvasAspectRatio) {
      // Video is wider than canvas - crop sides
      sourceWidth = videoHeight * canvasAspectRatio;
      sourceX = (videoWidth - sourceWidth) / 2;
    } else {
      // Video is taller than canvas - crop top/bottom
      sourceHeight = videoWidth / canvasAspectRatio;
      sourceY = (videoHeight - sourceHeight) / 2;
    }
  }

  // Draw cropped and scaled video to temp canvas
  tempCtx.drawImage(
    videoElement,
    sourceX, sourceY, sourceWidth, sourceHeight,  // source rectangle
    0, 0, cols, rows                               // destination rectangle
  );

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


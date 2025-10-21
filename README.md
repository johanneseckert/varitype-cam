# Variable ASCII Cam

A real-time webcam to ASCII art converter with a twist: instead of mapping ASCII characters to luminance values, it uses a **variable font's weight axis** (100-900) to represent brightness.

## Features

- **Variable Font Weight Mapping**: Uses Geist Mono's font-weight axis (100-900) to map luminance values
- **Real-time Performance**: Smooth 30-60 FPS rendering with optimized canvas operations
- **Multiple Character Presets**:
  - Blocks: `█▓▒░`
  - Classic ASCII: ` .:-=+*#%@`
  - Dots: `·⋅•●○`
  - Bars: `▁▂▃▄▅▆▇█`
  - Alphanumeric, Binary, Singles, and Custom
- **Extensive Controls**:
  - Resolution slider (20-200 characters)
  - Font size adjustment
  - Aspect ratio selection (16:9, 4:3, 1:1)
  - Weight mapping range customization
  - Color modes (monochrome/colored)
  - Video filters (brightness, contrast, invert)
  - Seeded randomization for multi-character sets
- **PNG Export**: Export the current canvas as a PNG image
- **Modern Dark UI**: Sleek dark mode design with moody gradient shadows

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- A modern web browser with webcam support

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser and allow webcam access when prompted.

### Build

```bash
npm run build
```

The built files will be in the `dist` directory.

## How It Works

1. **Video Capture**: Captures webcam feed using `getUserMedia()`
2. **Pixel Sampling**: Samples pixels at grid positions based on resolution
3. **Luminance Calculation**: Converts RGB values to luminance (0-255)
4. **Filter Application**: Applies brightness, contrast, and invert filters
5. **Weight Mapping**: Maps luminance to font-weight (configurable range)
6. **Canvas Rendering**: Draws characters with varying font weights

## Technologies

- React 19
- TypeScript
- Vite
- Leva (UI controls)
- HTML5 Canvas API
- WebRTC (getUserMedia)
- Geist Mono Variable Font

## Future Enhancements

- Vector (SVG) export
- Video recording/export
- Additional aspect ratios
- Performance optimizations for higher resolutions

## License

MIT

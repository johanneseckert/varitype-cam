# Variable ASCII Cam

A real-time webcam to ASCII art converter that uses **variable font axes** to represent brightness. Instead of traditional ASCII luminance mapping, this tool dynamically adjusts font properties (weight, width, or other axes) to create unique visual effects.

## Features

### 🎨 Variable Font System
- **Multiple Variable Fonts**: Choose from 8+ variable fonts including:
  - Geist Mono (weight axis)
  - JetBrains Mono (weight axis)
  - Bodoni Moda (weight & optical size)
  - Doto (weight & roundness)
  - Big Shoulders Stencil (weight & optical size)
  - Workbench & Sixtyfour (experimental BLED/SCAN axes)
  - And more...
- **Axis Mapping**: Map brightness to font weight, width, or other variable font axes
- **Dynamic Range Control**: Customize min/max axis values for different looks
- **Typography Controls**: Adjust line height and letter spacing

### 📝 Character Sets & Mapping
- **Preset Character Sets**:
  - MAX: Full ASCII character range
  - Blocks: `█▓▒░`
  - Classic: ` .:-=+*#%@`
  - Dots: `·⋅•●○`
  - Bars: `▁▂▃▄▅▆▇█`
  - Alphanumeric, Binary, Single character, and Custom
- **Advanced Mapping Modes**:
  - **Map to Brightness**: Characters selected based on luminance (gradient mode)
  - **Map to Color**: Characters selected based on hue
  - **Random Position**: Characters assigned randomly with seeded control
  - **Sequential**: Loop through characters in order
- **Seeded Randomization**: Reproducible randomization with adjustable seeds

### 🎬 Video Controls
- **Pause/Play**: Click video feed to freeze frame while still adjusting settings
- **Hover Controls**: Pause button appears on hover
- **Video Filters**:
  - Brightness adjustment (-100 to +100)
  - Contrast control (0 to 200%)
  - Gamma correction (0.1 to 3.0)
  - Invert mode

### 🖼️ Visual Settings
- **Aspect Ratios**: 16:9, 4:3, 1:1, or Tarot card proportions
- **Resolution Control**: 30-250 characters width (adjusts detail level)
- **Color Modes**:
  - Monochrome: Single foreground color
  - Colored: Full RGB color per character
- **Customizable Colors**: Choose foreground and background colors
- **Image Overlay**: Load and composite images over the video feed

### 💾 Export Options
- **PNG Export (1x)**: Export at current display resolution
- **PNG Export (4x)**: Export at 4x resolution for high-quality prints
- Both exports preserve all current settings and effects

### 🎹 MIDI Control (Experimental)
- **Hardware Integration**: Control sliders and parameters via MIDI controller
- **CC Mapping**: Map MIDI continuous controllers to any parameter
- **Note Triggers**: Trigger actions like export, overlay load, preset cycling
- Check console for MIDI device feedback

### 🎯 Real-time Performance
- Smooth 30 FPS rendering with optimized canvas operations
- Efficient pixel sampling at grid resolution
- Hardware-accelerated rendering

### 💅 Modern UI
- Sleek dark mode design with gradient accents
- Responsive controls panel (Leva)
- Moody aesthetic with purple/pink gradients

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

1. **Video Capture**: Captures webcam feed using WebRTC `getUserMedia()`
2. **Frame Sampling**: Samples video at 30 FPS to temporary canvas
3. **Pixel Sampling**: Extracts pixel data at grid positions based on resolution
4. **Color Analysis**: Calculates luminance (brightness) and hue for each pixel
5. **Character Selection**:
   - For gradient mode: Maps luminance to character from set
   - For hue mode: Maps color hue to character
   - For random mode: Uses seeded random assignment
   - For sequential mode: Loops through character set
6. **Filter Application**: Applies gamma, brightness, contrast, and invert to luminance
7. **Font Axis Mapping**: Maps filtered luminance to variable font axis (weight, width, etc.)
8. **Canvas Rendering**: Draws each character with dynamically adjusted font properties
9. **Pause Mode**: When paused, stores high-res snapshot for resolution-independent adjustments

## Usage Tips

- **Start Simple**: Begin with a single character preset (like "M" or "█") to see pure variable font effects
- **Experiment with Fonts**: Different fonts produce dramatically different results
  - Geist Mono: Clean, tech aesthetic
  - Bodoni Moda: Elegant, serif look
  - Doto: Rounded, playful style
  - Sixtyfour/Workbench: Glitchy, experimental effects
- **Pause to Fine-Tune**: Click the video to pause, then adjust all settings to perfect your composition
- **Resolution Sweet Spots**:
  - 80-120 for balanced detail/performance
  - 150-250 for high detail (may impact performance)
  - 30-60 for chunky, bold look
- **Hue Mapping**: Works best with colorful, varied backgrounds
- **Gradient Mapping**: Best for creating consistent luminance-based art
- **Overlays**: Use high-contrast images for best effect
- **Export at 4x**: For print-quality or high-res social media posts

## Technologies

- **React 19**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Leva**: Beautiful control panel UI
- **HTML5 Canvas API**: Hardware-accelerated rendering
- **WebRTC**: `getUserMedia()` for webcam access
- **Web MIDI API**: MIDI controller support
- **Variable Fonts**: Multiple custom variable font files

## Architecture

```
src/
├── components/
│   ├── AsciiCam.tsx          # Main component with Leva controls
│   └── WaveAnimation.tsx     # Background wave effect
├── hooks/
│   ├── useWebcam.ts          # Webcam access and management
│   ├── useAsciiRenderer.ts   # Core rendering loop
│   ├── useImageExport.ts     # PNG export (1x and 4x)
│   ├── useImageOverlay.ts    # Image overlay handling
│   └── useMidi.ts            # MIDI device integration
├── utils/
│   ├── luminance.ts          # Pixel processing and filters
│   ├── seededRandom.ts       # Character randomization
│   └── palettes.ts           # Color utilities
└── constants/
    ├── fonts.ts              # Variable font configurations
    ├── asciiPresets.ts       # Character set presets
    └── midiConfig.ts         # MIDI mappings
```

## Browser Compatibility

- Chrome/Edge 88+ (recommended)
- Firefox 94+
- Safari 15.4+

Requires:
- WebRTC support for webcam
- Canvas 2D API
- ES6+ JavaScript
- Variable font support (wght axis only; other axes not supported in Canvas 2D)

## Contributing

Contributions welcome! Areas for improvement:
- Additional variable fonts
- New character presets
- Performance optimizations
- Mobile/touch support
- Video recording/export
- SVG export
- Additional MIDI mappings

## Credits

Made with ♥︎ and AI by [Johannes Eckert](http://eckert.io)

## License

MIT

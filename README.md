# Variable ASCII Cam — React + TypeScript + Vite

Transforms a live webcam feed into real‑time ASCII art using Canvas 2D and a self‑hosted variable monospace font (Geist Mono). Includes controls for density, palette, brightness/contrast/gamma, invert, and `wght`.

## Quick start

```bash
npm i
npm run dev
```

Open the local URL and allow camera access. If your browser requires HTTPS for camera, see Local HTTPS below.

## Features (P1)

- Live webcam → ASCII at ~160×90 default grid
- Palettes: Classic, Blocks, Minimal, Alpha, Bars
- Adjustable: columns (density), brightness, contrast, gamma, invert
- Variable font axis: `wght` 100–800
- Snapshot to PNG, copy ASCII plaintext

## Local HTTPS

Some browsers (notably Safari) require HTTPS for camera.

1) Install mkcert and create a local cert:

```bash
brew install mkcert nss # macOS (nss for Firefox trust)
mkcert -install
mkcert localhost
```

This produces `localhost-key.pem` and `localhost.pem` in your project directory.

2) Run Vite with HTTPS:

Create `vite.config.ts` override or run with flags, e.g.

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync('localhost-key.pem'),
      cert: fs.readFileSync('localhost.pem'),
    },
  },
})
```

Alternatively, use a reverse proxy/dev cert tool of your choice.

## Fonts

- Geist Mono variable TTF is bundled in `public/GeistMono-VariableFont_wght.ttf` and loaded via `@font-face` in `src/index.css` as `GeistMonoVar`.
- The app renders with `font-variation-settings: "wght" <value>`; slider range 100–800.
- No external font network requests.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — typecheck and bundle
- `npm run preview` — preview production build
- `npm run lint` — ESLint

## Notes

- Performance varies by hardware; reduce columns or lower contrast/gamma if FPS drops.
- iOS/Safari: use HTTPS; if permissions fail, try a different browser.

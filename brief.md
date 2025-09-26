# Creative Brief — Live Webcam → ASCII (with Variable Fonts)

*Last updated: 26 Aug 2025*

## 1) Overview & Objectives

**Goal:** Build a playful, single‑page web app that transforms a user’s live webcam feed into real‑time ASCII art, rendered with a **variable, monospaced font**. Controls let users tweak density, contrast, palette, and font axes. Prioritize smoothness, clarity, and instant feedback.

**Primary Objectives (Phase 1):**

- Capture webcam video in‑browser via `getUserMedia()`.
- Convert frames to ASCII in real time (target 20–30 fps on mid‑range laptops at \~720p input, ASCII grid ≤ 200×120 cells).
- Render ASCII using a **bundled/self‑hosted** variable mono font shipped with the app (no external font requests). For P1 we use **Geist Mono (TTF)** with live axis control (e.g., weight, width, slant/italic).
- Provide essential controls (density, palette, brightness/contrast, font size, font axes).
- Offer basic snapshot export (PNG or copyable text), **no server**.

**Non‑Goals (Phase 1):**

- No recording video, no audio capture, no account system.
- No cloud processing; everything runs locally.
- No advanced shader pipeline or WASM yet (optional spikes allowed behind flags).

## 2) Audience & Use Cases

- Creators/designers exploring typographic/ASCII aesthetics.
- Educators demonstrating real‑time image sampling.
- Casual users who want a fun "ASCII selfie" or looped GIF (snapshot only in P1).

**Key use cases:**

1. Open site → allow webcam → see ASCII instantly → (optionally) tweak a few compact controls → take snapshot.
2. Minimal embed‑style usage where UI can be hidden/collapsed after initial setup.

## 3) Experience Principles

- **Instant:** Visible ASCII within a second of permission grant.
- **Minimal:** Small, unobtrusive controls with smart defaults; hide/collapse when not needed.
- **Legible:** Smart defaults, readable grid, accessible UI.
- **Private:** Processing stays in the browser; no data leaves the device.
- **Self‑contained:** No backend services; runs locally once loaded.

## 4) Scope — Phase 1 Features

### 4.1 Core

- Webcam capture (front/back camera selector where available).
- ASCII renderer with:
  - Character set presets (e.g., `@#%*+=-:.` | blocks | alphanumerics | braille‑ish).
  - Adjustable **density** (char cell size) and **scale**.
  - Brightness/contrast and optional gamma.
  - Mapping modes: **avg luminance** (default), median, or max.
  - Optional **invert**.
- **Variable font** support:
  - Ship **1 bundled variable monospaced font** for P1: **Geist Mono (TTF, self‑hosted)**. Additional fonts may be added later, also bundled/self‑hosted (no CDN).ono (TTF, self‑hosted)**. Additional fonts may be added later, also bundled/self‑hosted (no CDN).
  - Pre‑define per font the **luminance axis** (usually `wght`) that drives tone mapping; provide live controls for that axis and other available axes (e.g., `wdth`, `slnt/ital`), with luminance tied only to the pre‑defined axis.
- **Performance budget
  - Target 20–30 fps on mid‑range hardware for 160×90 ASCII grid.
  - Auto scale down grid on slow devices; expose a “Performance” toggle.
- **Snapshots:**
  - Export rasterized PNG of the ASCII canvas.
  - Copy ASCII plaintext to clipboard.

### 4.2 UI

- **Compact control strip** (single row or small dock) with only the essentials: Density, Palette, **Axes (global, non‑luminance)**, Brightness/Contrast.
- **Advanced drawer** (optional): reveals gamma, invert, per‑cell/banded mapping (can be omitted for strict minimal mode).
- **Hide UI toggle**: collapse all controls to a tiny pill; keyboard shortcut to show/hide.
- **No modal flows**; everything inline.

### 4.3 Accessibility & Privacy

- Keyboard navigable controls and buttons.
- Respect reduced motion (limit update rate to UI animations only).
- Clear, friendly webcam permission explainer.
- No storage of images or streams; no network calls by default.

## 5) Out of Scope / Future (Phase 2+)

- WebGL shader pipeline and/or WASM acceleration.
- Recording (webm/gif) and animated export.
- Multi‑pass dithering (e.g., Floyd–Steinberg) and color ASCII modes.
- Text flow layouts, curved baselines, kerning art.
- Multi‑font palettes; user font uploads.
- **React package / headless component** for programmatic control (see §17).

## 6) User Flow (MVP)

1. **Landing** → hero with “Start” button; one sentence explaining the app.
2. **Permission** → native camera prompt + on‑page guidance.
3. **Live View** → ASCII output appears; default preset applied.
4. **Tweak** → user adjusts density, palette, font axes; output updates live.
5. **Snapshot** → download PNG or copy text.

```
[Landing] → [Grant Camera] → [ASCII Live] → [Tweak Controls] → [Snapshot]
```

## 7) Technical Approach

### 7.1 Stack

- **Front‑end only** SPA.
- **TypeScript** + lightweight bundler (e.g., Vite) for fast dev.
- **Canvas 2D** pipeline in P1; abstract renderer for future WebGL.
- Styling: small utility CSS or Tailwind; no heavy UI framework needed.

### 7.2 Capture

- Use `navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })`.
- Render video to an **offscreen canvas**; sample pixels from that buffer.
- HTTPS required for camera access; handle denial and error states.

### 7.3 ASCII Rendering Pipeline (P1)

1. Scale source to a working buffer (W×H) where W,H ≈ grid size × sample size.
2. For each char cell (cx, cy):
   - Sample block of pixels; compute luminance L per pixel, then **mean** L.
   - Map L ∈ [0,1] to a **character index** from darkest → lightest.
3. Build a string line by line and paint to a `<canvas>` or `<pre>`.
   - **Canvas approach:** drawText per char (fast with glyph atlas) or per row.
   - **Text DOM approach:** single `<pre>` with monospace + CSS; likely slower but simpler. Start with Canvas drawText.

**Luminance:**

- Use linearized RGB or sRGB approximation: `L ≈ 0.2126R + 0.7152G + 0.0722B` (R,G,B ∈ [0,1]).
- Apply global brightness/contrast and optional gamma before mapping.

**Character Mapping:**

- Prepare several ordered palettes (dark→light) with adjustable length.
- Optional per‑palette lookup table with precomputed **coverage** rank.

**Density:**

- Control char cell size (px per char). Smaller cells → sharper detail but slower.

### 7.4 Variable Fonts

- Ship a **variable monospace** (initially it'll be "G
- **Luminance axisile).
- Load via `@font-face` and `font-variation-settings`.
- - **Luminancedefined):** Each supported font specifies the single axis used for luminance mapping **and its numeric range** (e.g., *Geist Mono* — `wght: 100–800`). Per‑cell video luminance is mapped into this range to produce tone.
- **User‑controlled axes:** Any other available axes (e.g., `wdth`, `slnt/ital`) are exposed as sliders and do **not** influence luminance mapping.
- **Advanced (optional):** Allow clamping the luminance axis min/max for a font, but keep the **axis choice** fixed per font.
- Performance tip: render to canvas using `OffscreenCanvas` where supported; consider **glyph atlas** pre-render for top 256 glyphs × 2–3 axis combos.



#### Supported Fonts & Luminance Axis (initial)

| Font        | File/Source     | Luminance axis | Numeric range | Notes                                   |
|-------------|------------------|----------------|---------------|-----------------------------------------|
| Geist Mono  | TTF (self‑host)  | `wght`         | 100–800       | Default font in P1; other axes user‑controlled.

_Add more rows here as additional fonts are introduced. Each font must declare exactly one luminance axis and its numeric range._

### 7.5 Fallbacks & Compatibility

- Safari/iOS quirks: require HTTPS; test iOS 16+ camera permissions.
- Reduce grid size on mobile by default; expose quality vs. speed toggle.
- If camera unavailable/denied, swap in a sample video to let users play.

### 7.6 Performance Targets

- **Baseline:** 160×90 char grid at ≥ 20 fps on a 2020+ laptop.
- Work budget per frame: ≤ 40ms (including sampling + render).
- Throttle on hidden tab or when FPS < target: auto‑reduce grid scale.

## 8) Controls (Phase 1) — Defaults

- **Preset:** Classic.
- **Palette:** `@#%*+=-:.` (dark→light). Options: heavy blocks, alphanumeric, minimalist `# .`.
- **Density (Cell Size):** 8 px (range 5–16).
- **Font Size:** 12–24 px (depending on screen; auto fit width).
- **Brightness / Contrast / Gamma:** 0 / 0 / 1.0 (ranges ±0.5; gamma 0.5–2.5).
- **Invert:** Off.
- **Axes:** wght 400–800 (default 500), wdth 100–100 (monospace fixed) if available; slnt 0 if present.
- **FPS Indicator:** Off by default.

## 9) Data & Telemetry

- Phase 1: **no analytics**. Optionally console log for dev.
- If later adding telemetry, provide a privacy toggle and document exactly what’s collected.

## 10) Testing Plan

**Functional:**

- Camera permission grant/deny/timeout paths.
- Correct palette mapping (dark areas use dark glyphs).
- Controls update output live; presets restore expected values.
- Snapshot PNG equals visible ASCII output (same dimensions/colors).

**Compatibility:**

- Desktop: Chrome, Firefox, Safari (latest) on macOS/Windows.
- Mobile sanity: iOS Safari, Android Chrome (lower default density).

**Performance:**

- Verify FPS stays within budget across densities; auto‑scaler works.

**Accessibility:**

- Keyboard tab order, ARIA labels; readable control contrast.

## 11) Deliverables & Definition of Done (P1)

- Source repo with **README** (setup, build, local HTTPS instructions).
- SPA that:
  - Requests webcam and shows ASCII live view.
  - Provides controls listed in §8 with presets.
  - Exports snapshot PNG and copies plaintext ASCII.
  - Runs fully offline after first load (optional PWA flag).
- Basic unit tests for mapping and palette ordering; smoke E2E for grant/deny.

**Acceptance Criteria:**

- On a mid‑range laptop, default preset hits ≥ 20 fps at 160×90.
- All core controls affect output as expected.
- No network calls after load; no data leaves device.
- Works on Chrome/Firefox/Safari desktop; mobile degrades gracefully.

## 12) Risks & Mitigations

- **Font perf with canvas text:**
  - *Mitigation:* Glyph atlas; measure drawText vs. pre‑rasterized tiles.
- **Camera permission friction (iOS/Safari):**
  - *Mitigation:* Clear explainer; HTTPS; sample video fallback.
- **Mobile thermal throttling:**
  - *Mitigation:* Adaptive density; cap FPS; pause on background.
- **Layout jank with variable axes:**
  - *Mitigation:* Stick to monospaced fonts; freeze metrics; test axis ranges.
- **CORS/licensing on fonts:**
  - *Mitigation:* Bundle fonts; verify license; self‑host.

## 13) Open Questions (for Product/Design/Eng)

1. **Fonts:** Which variable monospace(s) do we ship? License terms? Axis ranges?
2. **Rendering target:** Canvas text vs. precomposed `<pre>`? P1 default is Canvas—agree?
3. **Per‑glyph axis modulation:** Keep global axes only in P1 or enable an experimental toggle mapping luminance → `wght`?
4. **Color:** Monochrome only in P1, or allow foreground/background color pickers?
5. **Snapshot:** PNG only or also SVG/text download? (Text copy is planned.)
6. **Mobile:** Minimum supported iOS/Android versions? Default grid sizes?
7. **Branding:** Need a logo/wordmark, or ship neutral UI?
8. **Hosting:** Domain + HTTPS cert plan? Any PWA/offline requirement?
9. **Analytics:** Keep P1 telemetry‑free? (Recommended.)
10. **Accessibility:** Any specific requirements (contrast ratios, reduced motion)?

## 14) Implementation Notes & Pseudocode

**Luminance mapping (simplified):**

```ts
function luminance(r,g,b){
  // r,g,b are 0..255 sRGB; approximate to avoid costly linearization
  return 0.2126*r + 0.7152*g + 0.0722*b; // 0..255
}

function charForL(L, palette){
  const idx = Math.round((1 - L/255) * (palette.length-1));
  return palette[idx];
}
```

**Frame loop (Canvas 2D):**

```ts
// offscreenCtx has video frame; asciiCtx draws text
t = performance.now();
for (let y=0; y<rows; y++){
  for (let x=0; x<cols; x++){
    // sample block avg
    const L = avgLuminance(blockPixels(x,y));
    rowChars[x] = charForL(L, palette);
  }
  asciiCtx.fillText(rowChars.join(""), startX, startY + y*lineHeight);
}
```

**Variable font (global axes):**

```css
.ascii { font-family: "OurVariableMono", monospace; font-variation-settings: "wght" 600, "wdth" 100; }
```

## 15) Milestones (Suggested)

- **M0 — Spike (2–3 days):** getUserMedia + naive Canvas 2D ASCII @ \~100×60; ship one variable font.
- **M1 — MVP (1 week):** controls panel, presets, snapshots, performance scaler, a11y basics.
- **M2 — Polish (3–4 days):** glyph atlas optimization, FPS indicator, mobile defaults, README/tests.

## 16) Success Metrics

- Tech: ≥20 fps at default grid; ≤1s time‑to‑first‑ASCII after permission.
- UX: Users can reach a pleasing result **without touching any controls**; minimal UI does not obstruct the video.
- Stability: No console errors in common flows; memory stable over 5 minutes.

### Appendix A — Character Palettes (dark → light)

- **Classic:** `@#%*+=-:. `
- **Blocks:** `█▓▒░· `
- **Minimal:** `#· `
- **Alpha:** `MWNHD$&%*o=+;:-,.· `
- **Bars:** `█▇▆▅▄▃▂▁ `

### Appendix B — Acceptance Test Scenarios

- Deny camera → UI offers sample video; controls still function.
- Toggle invert → obviously flips dark/light mapping.
- Change density → FPS stays ≥ target by auto‑scaling grid.
- Move wght slider → visible stroke change without layout shift.
- Snapshot → downloaded PNG matches visible ASCII frame.



## 17) Phase 2 — React Package (Headless / Minimal UI)

**Objective:** Provide a tiny **React component** that exposes all parameters as props and events, so other sites or demos can control the renderer **in code** with no built‑in UI.

**Deliverable:** `@ascii-cam/react`

- `<AsciiCam />` component rendering to `<canvas>`.
- **Props:** `palette`, `density`, `fontSize`, `axes={{ wght, wdth, slnt }}`, `axisMode` ('global'|'bands'|'perCell'), `brightness`, `contrast`, `gamma`, `invert`, `onSnapshot`, etc.
- **Imperative handle:** `ref` with `takeSnapshot()`, `start()`, `stop()`, `setAxes()`, `setPalette()`, etc.
- **Style‑free:** no CSS opinions; consumer decides.
- **Optional mini‑UI package**: `@ascii-cam/controls` with the compact strip/drawer used in the website.

**Notes:** Keep the website as a thin wrapper that imports the React component and the minimal controls; this guarantees consistency and keeps the site small.

## Future Expansion Ideas

- **MIDI controller–driven parameters (prototype spike):**
  - **What:** Use the Web MIDI API to let a hardware MIDI controller drive app parameters in real time (knobs/faders/buttons mapping to density, brightness/contrast/gamma, invert, palette selection, and **variable‑font axes** such as `wght`/`wdth`, incl. per‑cell mapping depth).
  - **Why:** Tactile control encourages playful exploration and can demo the character×axis luminance concept on stage.
  - **How (outline):**
    - Request MIDI access (`navigator.requestMIDIAccess({ sysex:false })`).
    - Map incoming **CC** messages to UI actions via a small routing table (controller model → CC numbers → parameter).
    - Provide a “Learn” mode to bind a control by moving it; persist mapping in `localStorage`.
    - Optional smoothing (1–5 frames) to avoid jitter; clamp to safe ranges.
  - **Status:** Future spike; non‑blocking for P1.
  - **Risks/Notes:** Browser support is best in Chromium; Safari iOS lacks Web MIDI (consider fallback like on‑screen knobs or OSC via WebSocket from a companion app).
  - **Acceptance (when we do it):** Move a MIDI knob → parameter updates with ≤1‑frame latency; mappings survive reload; disabling MIDI restores normal UI behavior.



## Scoped‑Down Mapping Mode — Shuffle Palette + Axis‑Driven Luminance (P1 option)

**Concept:** Simplify the coupling between tone and typography by letting a **variable‑font axis** (e.g., `wght` or `wdth`) carry the luminance mapping, while the **character set** is **randomized** (decorative). A **Shuffle** button permutes the char→luminance mapping without changing the overall brightness structure (because tone comes from the axis).

**UI Additions:**

- **Character Set input** with a dropdown of presets (Classic, Blocks, Minimal, Alphanumeric…).
- **Shuffle** button: re‑seed the permutation that maps luminance ranks → characters.
- **Luminance axis (fixed per font):** display which axis and range drive tone (e.g., “Tone axis: `wght` 100–800”); allow min/max clamps only. Other axes remain user‑controlled.
- **Axis Range clamps:** min/max sliders for the chosen axis (e.g., `wght 350–850`).
- **Mode toggle:** *Axis‑only tone* vs *Classic (character‑ordered)*.

**Algorithm (Axis‑only tone):**

1. **Palette P:** list of user characters, length N.
2. **Permutation R:** random permutation of `[0…N−1]` (store seed for repeatability).
3. For each cell luminance **L ∈ [0,255]**:
   - Compute **axis value** `A = lerp(Amin, Amax, 1 − L/255)`.
   - Compute **rank** `r = floor((1 − L/255) * (N − 1))`.
   - Pick **char** `ch = P[ R[r] ]` (randomized; decorative only).
   - Draw with font variation settings `{ [luminanceAxis]: A }` (other axes fixed).

**Notes & Options:**

- **Bands for performance:** Quantize `A` to 3–5 steps, batch draw by axis band per row.
- **Seeded shuffle:** Use a visible seed so users can reproduce a look; Shuffle regenerates the seed.
- **Neutral palettes:** To reduce unintended tone bias from glyph shapes, offer a “neutral” set (e.g., `•◦·:=`) in addition to random letters.

**Acceptance Criteria:**

- Tapping **Shuffle** changes glyph shapes but **does not** change the perceived brightness pattern.
- Switching the **Axis for Luminance** clearly changes tonality (e.g., heavier `wght` looks darker) while layout remains aligned.
- When the selected axis is not supported by the current font, the UI disables the choice and falls back to the next available axis.

**Risks & Mitigations:**

- **Monospace integrity:** Some `wdth` implementations may alter advance width. *Mitigation:* prefer `wght` for tone; if `wdth` shifts metrics, clamp its range or render with fixed advance using manual positioning.
- **Performance (per‑cell axis changes):** *Mitigation:* banding + batching; cache glyph runs per band.
- **Perceived tone drift from glyph shapes:** *Mitigation:* offer neutral palettes; let users increase band count to rely more on axis than character.

**Pseudocode sketch:**

```ts
let seed = Date.now();
let P = getCharsFromInput();
let R = shuffledIndices(P.length, seed);

function axisValueForL(L, min, max){
  const t = 1 - (L/255);
  return min + t * (max - min);
}

for (let y=0; y<rows; y++){
  // optional: pre-bucket cells into 3–5 axis bands for this row
  for (let x=0; x<cols; x++){
    const L = avgLuminance(block(x,y));
    const A = axisValueForL(L, A_min, A_max);
    const r = Math.floor((1 - L/255) * (P.le[luminanceAxis]    const ch = P[ R[r] ];
    drawChar(x,y,ch,{ [chosenAxis]: quantizeToBand(A) });
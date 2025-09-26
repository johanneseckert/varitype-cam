import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { DEFAULT_PALETTE_NAME, PALETTES, getPalette } from './utils/palettes'
import type { PaletteName } from './utils/palettes'
import { adjustLuminance, luminance, rgbToHue } from './utils/tone'

type StartState = 'idle' | 'starting' | 'running' | 'error'

const DEFAULT_COLUMNS = 160
const DEFAULT_FONT_SIZE = 12

function makePermutation(n: number, seed: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i)
  let s = seed >>> 0
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0 // LCG
    const j = s % (i + 1)
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function App() {
  const [state, setState] = useState<StartState>('idle')
  const [error, setError] = useState<string | null>(null)

  // Controls
  const [columns, setColumns] = useState<number>(DEFAULT_COLUMNS)
  const [paletteName, setPaletteName] = useState<PaletteName>(DEFAULT_PALETTE_NAME)
  const [brightness, setBrightness] = useState<number>(0)
  const [contrast, setContrast] = useState<number>(0)
  const [gamma, setGamma] = useState<number>(1)
  const [invert, setInvert] = useState<boolean>(false)
  const [monochrome, setMonochrome] = useState<boolean>(true)
  const [format, setFormat] = useState<'16:9' | '3:4'>('16:9')
  const [lineScale, setLineScale] = useState<number>(1.15) // line height multiplier
  const [seed, setSeed] = useState<number>(123456789)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const processCanvasRef = useRef<HTMLCanvasElement | null>(null) // offscreen buffer
  const asciiCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const pctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const actxRef = useRef<CanvasRenderingContext2D | null>(null)
  const colsRef = useRef<number>(columns)
  const rowsRef = useRef<number>(Math.max(1, Math.round(columns * (9 / 16))))
  const lineHeightRef = useRef<number>(Math.floor(DEFAULT_FONT_SIZE * 1.15))
  const charWidthRef = useRef<number>(Math.floor(DEFAULT_FONT_SIZE * 0.6))
  const optionsRef = useRef({ brightness, contrast, gamma, invert })
  const paletteRef = useRef<string[]>(getPalette(paletteName))
  const asciiTextRef = useRef<string>('')
  const huePermRef = useRef<number[] | null>(null)
  const monochromeRef = useRef<boolean>(true)

  const devicePixelRatioSafe = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1

  const palette = useMemo(() => getPalette(paletteName), [paletteName])

  // Keep refs up to date
  useEffect(() => {
    optionsRef.current = { brightness, contrast, gamma, invert }
  }, [brightness, contrast, gamma, invert])

  useEffect(() => {
    monochromeRef.current = monochrome
  }, [monochrome])

  useEffect(() => {
    paletteRef.current = palette
    huePermRef.current = makePermutation(palette.length, seed >>> 0)
  }, [palette, seed])

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    pctxRef.current = null
    actxRef.current = null
    setState('idle')
  }, [])

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  const configureSurfaces = useCallback(() => {
    const video = videoRef.current
    const processCanvas = processCanvasRef.current
    const asciiCanvas = asciiCanvasRef.current
    if (!video || !processCanvas || !asciiCanvas) return

    // Target aspect comes from selection (height/width)
    const aspect = format === '16:9' ? 9 / 16 : 4 / 3
    const targetCols = columns

    // Prepare drawing context and measure glyph metrics first
    const actx = asciiCanvas.getContext('2d')!
    actxRef.current = actx
    const fontSize = DEFAULT_FONT_SIZE
    const lineHeight = Math.max(1, Math.floor(fontSize * lineScale))
    lineHeightRef.current = lineHeight
    actx.font = `400 ${fontSize}px "GeistMonoVar", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
    actx.textBaseline = 'top'
    // Measure average character advance using a longer sample to reduce jitter
    const sample = 'W'.repeat(100)
    const measured = actx.measureText(sample)
    const approxCharWidth = Math.max(1, (measured.width || fontSize * 0.6) / 100)
    charWidthRef.current = approxCharWidth

    // Compute rows so that displayed canvas matches target aspect
    const targetRows = Math.max(1, Math.round(targetCols * aspect * (approxCharWidth / lineHeight)))

    colsRef.current = targetCols
    rowsRef.current = targetRows

    const pctx = processCanvas.getContext('2d', { willReadFrequently: true })!
    processCanvas.width = targetCols
    processCanvas.height = targetRows
    pctxRef.current = pctx

    // Size the visible canvas in CSS pixels; back buffer uses DPR
    asciiCanvas.style.width = `${targetCols * approxCharWidth}px`
    asciiCanvas.style.height = `${targetRows * lineHeight}px`
    asciiCanvas.width = Math.round(targetCols * approxCharWidth * devicePixelRatioSafe)
    asciiCanvas.height = Math.round(targetRows * lineHeight * devicePixelRatioSafe)

    // Apply font and variation settings
    actx.setTransform(devicePixelRatioSafe, 0, 0, devicePixelRatioSafe, 0, 0)
    actx.fillStyle = '#111'
    actx.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height)
    actx.fillStyle = '#eee'
  }, [columns, devicePixelRatioSafe, format, lineScale])

  // Reconfigure when columns/format/line height change during run
  useEffect(() => {
    if (state !== 'running') return
    configureSurfaces()
  }, [columns, format, lineScale, state, configureSurfaces])

  const start = useCallback(async () => {
    if (state === 'starting' || state === 'running') return
    setError(null)
    setState('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()

      configureSurfaces()

      const render = () => {
        const videoEl = videoRef.current!
        const pctx = pctxRef.current
        const actx = actxRef.current
        const asciiCanvas = asciiCanvasRef.current
        if (!pctx || !actx || !asciiCanvas) {
          rafRef.current = requestAnimationFrame(render)
          return
        }

        const targetCols = colsRef.current
        const targetRows = rowsRef.current

        const vw = videoEl.videoWidth
        const vh = videoEl.videoHeight
        if (!vw || !vh) {
          rafRef.current = requestAnimationFrame(render)
          return
        }

        // Draw current frame scaled into small buffer with fill + crop to target aspect
        const scale = Math.max(targetCols / vw, targetRows / vh)
        const sw = Math.floor(targetCols / scale)
        const sh = Math.floor(targetRows / scale)
        const sx = Math.floor((vw - sw) / 2)
        const sy = Math.floor((vh - sh) / 2)
        pctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, targetCols, targetRows)
        const imageData = pctx.getImageData(0, 0, targetCols, targetRows)
        const data = imageData.data

        actx.fillStyle = '#111'
        actx.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height)
        if (monochromeRef.current) {
          actx.fillStyle = '#eee'
        }

        const lines: string[] = new Array(targetRows)
        let offset = 0
        const opts = optionsRef.current
        const pal = paletteRef.current
        const perm = huePermRef.current || undefined
        const lineHeight = lineHeightRef.current
        const charW = charWidthRef.current
        for (let y = 0; y < targetRows; y++) {
          let row = ''
          for (let x = 0; x < targetCols; x++) {
            const r = data[offset]
            const g = data[offset + 1]
            const b = data[offset + 2]
            const L0 = luminance(r, g, b)
            const L = adjustLuminance(L0, opts) // drives weight only
            const hue = rgbToHue(r, g, b) // drives character choice
            const bin = Math.max(0, Math.min(pal.length - 1, Math.floor((hue / 360) * pal.length)))
            const charIdx = perm ? perm[bin] % pal.length : bin
            const ch = pal[charIdx]

            // Map brightness to variable font weight (100..800), darker → heavier
            const wght = Math.round(100 + (1 - L / 255) * (800 - 100))
            actx.font = `${wght} ${DEFAULT_FONT_SIZE}px "GeistMonoVar", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
            if (!monochromeRef.current) {
              // Color by hue only (fixed saturation/lightness)
              actx.fillStyle = `hsl(${Math.round(hue)}, 90%, 60%)`
            }
            actx.fillText(ch, x * charW, y * lineHeight)
            row += ch
            offset += 4
          }
          lines[y] = row
        }
        asciiTextRef.current = lines.join('\n')

        rafRef.current = requestAnimationFrame(render)
      }

      setState('running')
      rafRef.current = requestAnimationFrame(render)
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Failed to start camera')
      setState('error')
    }
  }, [configureSurfaces, state])

  const snapshotPng = useCallback(() => {
    const canvas = asciiCanvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ascii-snapshot.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [])

  const copyAsciiText = useCallback(async () => {
    const text = asciiTextRef.current
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <h1 style={{ margin: 0 }}>ASCII Cam</h1>
      <p style={{ margin: 0, opacity: 0.8 }}>Live webcam → ASCII, Canvas 2D</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
        {state !== 'running' && (
          <button onClick={start} disabled={state === 'starting'}>{state === 'starting' ? 'Starting…' : 'Start'}</button>
        )}
        {state === 'running' && (<>
          <button onClick={stop}>Stop</button>
          <button onClick={snapshotPng}>Snapshot PNG</button>
          <button onClick={copyAsciiText}>Copy Text</button>
        </>)}
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span>Cols</span>
          <input type="range" min={60} max={240} step={10} value={columns} onChange={(e) => setColumns(parseInt(e.target.value, 10))} />
          <input type="number" min={40} max={400} step={10} value={columns} onChange={(e) => setColumns(parseInt(e.target.value || '0', 10))} style={{ width: 70 }} />
        </label>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span>Palette</span>
          <select value={paletteName} onChange={(e) => setPaletteName(e.target.value as PaletteName)}>
            {Object.keys(PALETTES).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span>Seed</span>
          <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value || '0', 10))} style={{ width: 120 }} />
          <button onClick={() => setSeed((Math.random() * 2**31) | 0)}>Shuffle</button>
        </label>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span>Format</span>
          <select value={format} onChange={(e) => setFormat(e.target.value as '16:9' | '3:4')}>
            <option value="16:9">16:9</option>
            <option value="3:4">3:4</option>
          </select>
        </label>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span>Bright</span>
          <input type="range" min={-0.5} max={0.5} step={0.01} value={brightness} onChange={(e) => setBrightness(parseFloat(e.target.value))} />
        </label>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span>Contrast</span>
          <input type="range" min={-0.5} max={0.5} step={0.01} value={contrast} onChange={(e) => setContrast(parseFloat(e.target.value))} />
        </label>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span>Gamma</span>
          <input type="range" min={0.5} max={2.5} step={0.05} value={gamma} onChange={(e) => setGamma(parseFloat(e.target.value))} />
        </label>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span>Invert</span>
          <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} />
        </label>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span>Line H</span>
          <input type="range" min={0.8} max={1.6} step={0.01} value={lineScale} onChange={(e) => setLineScale(parseFloat(e.target.value))} />
        </label>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span>Monochrome</span>
          <input type="checkbox" checked={monochrome} onChange={(e) => setMonochrome(e.target.checked)} />
        </label>
        {/* Weight slider removed: weight is driven by brightness per cell */}
      </div>

      {error && <div style={{ color: '#ff6b6b' }}>{error}</div>}

      <canvas ref={asciiCanvasRef} style={{ background: '#111', borderRadius: 8, fontFamily: 'GeistMonoVar, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }} />

      {/* Hidden elements */}
      <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
      <canvas ref={processCanvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default App

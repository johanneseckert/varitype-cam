import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { DEFAULT_PALETTE_NAME, PALETTES, getPalette } from './utils/palettes'
import type { PaletteName } from './utils/palettes'
import { adjustLuminance, indexForL, luminance } from './utils/tone'

type StartState = 'idle' | 'starting' | 'running' | 'error'

const DEFAULT_COLUMNS = 160
const DEFAULT_FONT_SIZE = 12

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
  const [weight, setWeight] = useState<number>(500)

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
  const optionsRef = useRef({ brightness, contrast, gamma, invert })
  const paletteRef = useRef<string[]>(getPalette(paletteName))
  const asciiTextRef = useRef<string>('')

  const devicePixelRatioSafe = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1

  const palette = useMemo(() => getPalette(paletteName), [paletteName])

  // Keep refs up to date
  useEffect(() => {
    optionsRef.current = { brightness, contrast, gamma, invert }
  }, [brightness, contrast, gamma, invert])

  useEffect(() => {
    paletteRef.current = palette
  }, [palette])

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

    const { videoWidth: vw, videoHeight: vh } = video
    const aspect = vh && vw ? vh / vw : 9 / 16
    const targetCols = columns
    const targetRows = Math.max(1, Math.round(targetCols * aspect))

    colsRef.current = targetCols
    rowsRef.current = targetRows

    const pctx = processCanvas.getContext('2d', { willReadFrequently: true })!
    processCanvas.width = targetCols
    processCanvas.height = targetRows
    pctxRef.current = pctx

    const actx = asciiCanvas.getContext('2d')!
    actxRef.current = actx

    const fontSize = DEFAULT_FONT_SIZE
    const lineHeight = Math.floor(fontSize * 1.15)
    lineHeightRef.current = lineHeight

    // Size the visible canvas in CSS pixels; back buffer uses DPR
    const approxCharWidth = fontSize * 0.6
    asciiCanvas.style.width = `${targetCols * approxCharWidth}px`
    asciiCanvas.style.height = `${targetRows * lineHeight}px`
    asciiCanvas.width = Math.floor(targetCols * approxCharWidth * devicePixelRatioSafe)
    asciiCanvas.height = Math.floor(targetRows * lineHeight * devicePixelRatioSafe)

    // Apply font and variation settings
    asciiCanvas.style.fontVariationSettings = `"wght" ${weight}`
    actx.setTransform(devicePixelRatioSafe, 0, 0, devicePixelRatioSafe, 0, 0)
    actx.fillStyle = '#111'
    actx.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height)
    actx.fillStyle = '#eee'
    actx.font = `${fontSize}px "GeistMonoVar", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
    actx.textBaseline = 'top'
  }, [columns, devicePixelRatioSafe, weight])

  // Reconfigure when columns or weight changes during run
  useEffect(() => {
    if (state !== 'running') return
    configureSurfaces()
  }, [columns, weight, state, configureSurfaces])

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

        // Draw current frame scaled into small buffer
        pctx.drawImage(videoEl, 0, 0, vw, vh, 0, 0, targetCols, targetRows)
        const imageData = pctx.getImageData(0, 0, targetCols, targetRows)
        const data = imageData.data

        actx.fillStyle = '#111'
        actx.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height)
        actx.fillStyle = '#eee'

        const rowChars: string[] = new Array(targetCols)
        const lines: string[] = new Array(targetRows)
        let offset = 0
        const opts = optionsRef.current
        const pal = paletteRef.current
        for (let y = 0; y < targetRows; y++) {
          for (let x = 0; x < targetCols; x++) {
            const r = data[offset]
            const g = data[offset + 1]
            const b = data[offset + 2]
            const L0 = luminance(r, g, b)
            const L = adjustLuminance(L0, opts)
            const idx = indexForL(L, pal.length)
            rowChars[x] = pal[idx]
            offset += 4
          }
          const row = rowChars.join('')
          lines[y] = row
          actx.fillText(row, 0, y * lineHeightRef.current)
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
          <span>wght</span>
          <input type="range" min={100} max={800} step={1} value={weight} onChange={(e) => setWeight(parseInt(e.target.value, 10))} />
        </label>
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

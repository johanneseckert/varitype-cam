import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useControls, button, folder } from 'leva'
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

  // Custom palette state
  const [customPaletteChars, setCustomPaletteChars] = useState<string>('M')
  const [showCustomInput, setShowCustomInput] = useState<boolean>(true)
  const [isMonochrome, setIsMonochrome] = useState<boolean>(true)

  // Camera Controls - reactive to state changes
  useControls('Camera', {
    startCamera: button(() => start(), { disabled: state === 'starting' || state === 'running' }),
    stopCamera: button(() => stop(), { disabled: state !== 'running' }),
    snapshotPng: button(() => snapshotPng(), { disabled: state !== 'running' }),
    copyText: button(() => copyAsciiText(), { disabled: state !== 'running' }),
  }, [state])

  // Main Controls
  const controls = useControls({

    // Video & Display
    'Display': folder({
      columns: { value: DEFAULT_COLUMNS, min: 60, max: 240, step: 10 },
      format: { value: '16:9 (video)', options: ['16:9 (video)', '3:4 (tarot)'] },
    }),

    // Character Mapping
    'Characters': folder({
      info: {
        value: 'Characters are assigned to a hue value in video/image. Font weight will increase with brightness.',
        editable: false
      },
      palette: { value: DEFAULT_PALETTE_NAME, options: Object.keys(PALETTES) },

      // Custom Palette (conditionally shown)
      ...(showCustomInput ? {
        customChars: {
          value: customPaletteChars,
          label: 'Custom Characters',
          onChange: (value: string) => {
            console.log('Custom chars changed:', value)
            setCustomPaletteChars(value)
          }
        }
      } : {}),

      seed: { value: 123456789, step: 1 },
      shuffle: button(() => {
        setSeedTrigger(Math.random())
      }),
    }),

    // Appearance
    'Appearance': folder({
      brightness: { value: 0, min: -0.5, max: 0.5, step: 0.01 },
      contrast: { value: 0, min: -0.5, max: 0.5, step: 0.01 },
      gamma: { value: 1, min: 0.5, max: 2.5, step: 0.05 },
      lineScale: { value: 1.15, min: 0.5, max: 1.2, step: 0.01, label: 'Line Height' },
      charSpacing: { value: 1.0, min: 0.5, max: 2.0, step: 0.01, label: 'Char Spacing' },
      backgroundColor: { value: '#111111' },
      invert: false,
      monochrome: true,
      ...(isMonochrome ? {
        foregroundColor: { value: '#eeeeee' }
      } : {}),
    }),
  })

  const controlsData = controls as any
  console.log('Controls data:', controlsData)

  // Extract values directly from the flat structure (Leva folders flatten the values)
  const {
    columns = DEFAULT_COLUMNS,
    format = '16:9 (video)',
    palette: paletteName = DEFAULT_PALETTE_NAME,
    seed = 123456789,
    brightness = 0,
    contrast = 0,
    gamma = 1,
    lineScale = 1.15,
    charSpacing = 1.0,
    backgroundColor = '#111111',
    invert = false,
    monochrome = true,
    foregroundColor = '#eeeeee'
  } = controlsData

  console.log('Extracted values:', { columns, format, paletteName, brightness, contrast, gamma, lineScale, charSpacing, backgroundColor, invert, monochrome, foregroundColor, seed })

  // Internal state for triggering shuffle
  const [seedTrigger, setSeedTrigger] = useState(0)

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
  const paletteRef = useRef<string[]>(getPalette(paletteName as PaletteName, paletteName === 'Custom' ? customPaletteChars : undefined))
  const asciiTextRef = useRef<string>('')
  const huePermRef = useRef<number[] | null>(null)
  const monochromeRef = useRef<boolean>(true)
  const backgroundColorRef = useRef<string>('#111111')
  const foregroundColorRef = useRef<string>('#eeeeee')

  const devicePixelRatioSafe = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1

  const palette = useMemo(() =>
    getPalette(paletteName as PaletteName, paletteName === 'Custom' ? customPaletteChars : undefined),
    [paletteName, customPaletteChars]
  )

  // Keep refs up to date
  useEffect(() => {
    console.log('Updating optionsRef with:', { brightness, contrast, gamma, invert })
    optionsRef.current = { brightness, contrast, gamma, invert }
  }, [brightness, contrast, gamma, invert])

  useEffect(() => {
    monochromeRef.current = monochrome
    backgroundColorRef.current = backgroundColor
    foregroundColorRef.current = foregroundColor
    setIsMonochrome(monochrome)
  }, [monochrome, backgroundColor, foregroundColor])

  useEffect(() => {
    paletteRef.current = palette
    huePermRef.current = makePermutation(palette.length, seed >>> 0)
  }, [palette, seed])

  // Update palette ref immediately when custom characters change
  useEffect(() => {
    if (paletteName === 'Custom') {
      console.log('Updating custom palette:', customPaletteChars)
      const newPalette = getPalette('Custom', customPaletteChars)
      console.log('New palette:', newPalette)
      paletteRef.current = newPalette
      huePermRef.current = makePermutation(newPalette.length, seed >>> 0)
    }
  }, [customPaletteChars, paletteName, seed])

  // Handle palette switching - show/hide custom input based on selection
  useEffect(() => {
    const isCustom = paletteName === 'Custom'
    setShowCustomInput(isCustom)
  }, [paletteName])

  // Handle shuffle button trigger
  useEffect(() => {
    if (seedTrigger > 0) {
      const newSeed = (Math.random() * 2**31) | 0
      // Update the permutation directly since we can't easily update Leva controls
      huePermRef.current = makePermutation(getPalette(paletteName as PaletteName, paletteName === 'Custom' ? customPaletteChars : undefined).length, newSeed)
    }
  }, [seedTrigger, paletteName, customPaletteChars])

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
    const aspect = format && format.includes('16:9') ? 9 / 16 : 4 / 3
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
    const baseCharWidth = Math.max(1, (measured.width || fontSize * 0.6) / 100)
    const approxCharWidth = baseCharWidth * charSpacing
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
    actx.fillStyle = backgroundColor
    actx.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height)
    actx.fillStyle = foregroundColor
  }, [columns, devicePixelRatioSafe, format, lineScale, charSpacing, backgroundColor, foregroundColor])

  // Reconfigure when columns/format/line height change during run
  useEffect(() => {
    if (state !== 'running') return
    configureSurfaces()
  }, [columns, format, lineScale, charSpacing, state, configureSurfaces])

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

        actx.fillStyle = backgroundColorRef.current
        actx.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height)
        if (monochromeRef.current) {
          actx.fillStyle = foregroundColorRef.current
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', padding: '20px' }}>
      <header style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 700 }}>ASCII Cam</h1>
        <p style={{ margin: '8px 0 0', opacity: 0.8, fontSize: '1.1rem' }}>
          Live webcam → ASCII with variable fonts
        </p>
      </header>

      {/* Simplified status - main state is now in Camera folder */}

      {error && (
        <div style={{
          color: '#dc3545',
          background: '#f8d7da',
          padding: '12px 20px',
          borderRadius: '8px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      <canvas
        ref={asciiCanvasRef}
        style={{
          background: backgroundColor,
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          fontFamily: 'GeistMonoVar, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
        }}
      />

      {/* Hidden elements */}
      <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
      <canvas ref={processCanvasRef} style={{ display: 'none' }} />
      </div>
  )
}

export default App

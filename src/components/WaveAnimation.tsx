import { useEffect, useRef } from 'react'

interface WaveAnimationProps {
  isActive: boolean
}

const GRID_SIZE = 35 // Characters per row/column for full coverage
const ANIMATION_SPEED = 0.02 // Smooth animation speed
const WAVE_AMPLITUDE = 350 // Weight range (400 ± 350 = 50-750)
const WAVE_FREQUENCY = 0.3 // Higher frequency for more visible waves
const FONT_SIZE = 28

// Random character selection
const CHARACTERS = ['M', 'W', 'N', 'H', 'A', 'B', 'O', '8', '#', '@', '&', '%']
const getRandomCharacter = () => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]

export function WaveAnimation({ isActive }: WaveAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const timeRef = useRef<number>(0)
  const characterRef = useRef<string>(getRandomCharacter())

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      console.warn('WaveAnimation: canvas not found')
      return
    }

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) {
      console.warn('WaveAnimation: could not get canvas context')
      return
    }

    console.log('WaveAnimation: Starting animation with character:', characterRef.current)

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()

    // Wait for font to load before starting animation
    const checkFont = async () => {
      try {
        await document.fonts.load(`400 ${FONT_SIZE}px GeistMonoVar`)
        console.log('WaveAnimation: Font loaded successfully')
      } catch (e) {
        console.warn('WaveAnimation: Font loading failed, using fallback')
      }
    }

    const animate = () => {
      timeRef.current += ANIMATION_SPEED
      const time = timeRef.current

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const cellWidth = canvas.width / GRID_SIZE
      const cellHeight = canvas.height / GRID_SIZE

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          // Create wave pattern using multiple sine waves
          const wave1 = Math.sin(time + x * WAVE_FREQUENCY + y * WAVE_FREQUENCY * 0.5)
          const wave2 = Math.sin(time * 1.3 + x * WAVE_FREQUENCY * 0.7 - y * WAVE_FREQUENCY * 0.3)
          const wave3 = Math.sin(time * 0.7 + (x + y) * WAVE_FREQUENCY * 0.4)

          // Combine waves for complex pattern
          const combined = (wave1 + wave2 * 0.6 + wave3 * 0.4) / 2.2

          // Map to font weight (100-800 range)
          const weight = Math.round(400 + combined * WAVE_AMPLITUDE)
          const clampedWeight = Math.max(100, Math.min(800, weight))

          // Very subtle opacity variation for depth (more muted)
          const opacity = 0.15 + (combined + 1) * 0.15 // 0.15 to 0.45

          // Very muted purple/pink colors based on position
          const hue = 270 + (x / GRID_SIZE) * 20 // 270° (purple) to 290° (subtle pink)
          const color = `hsla(${hue}, 25%, 25%, ${opacity})`

          // Set font with variable weight
          ctx.font = `${clampedWeight} ${FONT_SIZE}px GeistMonoVar, ui-monospace, monospace`
          ctx.fillStyle = color

          // Add subtle glow
          ctx.shadowColor = `rgba(139, 92, 246, ${opacity * 0.3})`
          ctx.shadowBlur = 10

          // Position in monospaced grid with diagonal offset per row
          const diagonalOffset = (y * cellWidth * 0.3) % cellWidth
          const posX = x * cellWidth + cellWidth / 2 + diagonalOffset
          const posY = y * cellHeight + cellHeight / 2

          ctx.fillText(characterRef.current, posX, posY)
        }
      }

      if (isActive) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    const startAnimation = () => {
      console.log('WaveAnimation: Starting animation loop')
      animationRef.current = requestAnimationFrame(animate)
    }

    checkFont().then(() => {
      startAnimation()
    })

    // Handle resize
    const handleResize = () => {
      resizeCanvas()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [isActive])

  if (!isActive) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        background: 'linear-gradient(135deg, #050508 0%, #0a0510 50%, #08050a 100%)',
        pointerEvents: 'none',
      }}
    />
  )
}
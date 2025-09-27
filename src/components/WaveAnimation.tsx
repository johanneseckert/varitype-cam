import { useEffect, useRef } from 'react'

interface WaveAnimationProps {
  isActive: boolean
}

const GRID_SIZE = 20 // Characters per row/column (reduced for testing)
const ANIMATION_SPEED_FAST = 0.025 // Much faster for testing (50x faster!)
const WAVE_AMPLITUDE = 350 // Weight range (400 ± 350 = 50-750)
const WAVE_FREQUENCY = 0.3 // Higher frequency for more visible waves

// Random character selection
const CHARACTERS = ['M', 'W', 'N', 'H', 'A', 'B', 'O', '8', '#', '@', '&', '%']
const getRandomCharacter = () => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]

export function WaveAnimation({ isActive }: WaveAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const timeRef = useRef<number>(0)
  const charsRef = useRef<HTMLSpanElement[]>([])

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const container = containerRef.current
    if (!container) {
      console.warn('WaveAnimation: container not found')
      return
    }

    console.log('WaveAnimation: Starting animation')

    // Wait for font to load before starting animation
    const checkFont = async () => {
      try {
        await document.fonts.load('400 32px GeistMonoVar')
        console.log('WaveAnimation: Font loaded successfully')
      } catch (e) {
        console.warn('WaveAnimation: Font loading failed, using fallback')
      }
    }

      const createGrid = () => {
        // Create grid of characters
        const chars: HTMLSpanElement[] = []
        container.innerHTML = '' // Clear previous

        // Pick ONE random character for the entire animation
        const chosenCharacter = getRandomCharacter()
        console.log('WaveAnimation: Using character:', chosenCharacter)

        // Animation uses character: ${chosenCharacter}

        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            const span = document.createElement('span')
            span.textContent = chosenCharacter
          span.style.position = 'absolute'
          span.style.fontFamily = 'GeistMonoVar, ui-monospace, monospace'
          span.style.fontSize = '32px'
          span.style.color = '#666'
          span.style.fontVariationSettings = '"wght" 400'
          span.style.fontWeight = '400' // Fallback for non-variable fonts
          span.style.userSelect = 'none'
          span.style.pointerEvents = 'none'

          // Position in grid
          const cellWidth = window.innerWidth / GRID_SIZE
          const cellHeight = window.innerHeight / GRID_SIZE
          span.style.left = `${x * cellWidth + cellWidth / 2}px`
          span.style.top = `${y * cellHeight + cellHeight / 2}px`
          span.style.transform = 'translate(-50%, -50%)'

          container.appendChild(span)
          chars.push(span)
        }
      }

      charsRef.current = chars
      return chars
    }

    const animate = () => {
      timeRef.current += ANIMATION_SPEED_FAST // Use faster speed for testing
      const time = timeRef.current

        // Animation is running smoothly

      const chars = charsRef.current
      chars.forEach((span, index) => {
        const x = index % GRID_SIZE
        const y = Math.floor(index / GRID_SIZE)

        // Create wave pattern using multiple sine waves
        const wave1 = Math.sin(time + x * WAVE_FREQUENCY + y * WAVE_FREQUENCY * 0.5)
        const wave2 = Math.sin(time * 1.3 + x * WAVE_FREQUENCY * 0.7 - y * WAVE_FREQUENCY * 0.3)
        const wave3 = Math.sin(time * 0.7 + (x + y) * WAVE_FREQUENCY * 0.4)

        // Combine waves for complex pattern
        const combined = (wave1 + wave2 * 0.6 + wave3 * 0.4) / 2.2

        // Map to font weight (100-800 range) - more dramatic
        const weight = Math.round(400 + combined * WAVE_AMPLITUDE)
        const clampedWeight = Math.max(100, Math.min(800, weight))

        // Weight calculated successfully

        // Apply variable font weight (try multiple approaches)
        span.style.fontVariationSettings = `"wght" ${clampedWeight}`
        span.style.fontWeight = clampedWeight.toString() // Alternative approach

        // Apply the calculated weight

        // Subtle opacity variation for depth
        const opacity = 0.3 + (combined + 1) * 0.35 // 0.3 to 1.0
        span.style.opacity = opacity.toString()
      })

      if (isActive) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    const startAnimation = () => {
      createGrid()
      // Start animation immediately
      console.log('WaveAnimation: Starting animation loop')
      animationRef.current = requestAnimationFrame(animate)
    }

    checkFont().then(() => {
      startAnimation()
    })

    // Cleanup on resize
    const handleResize = () => {
      if (!isActive) return
      // Reposition characters on resize
      const chars = charsRef.current
      chars.forEach((span, index) => {
        const x = index % GRID_SIZE
        const y = Math.floor(index / GRID_SIZE)
        const cellWidth = window.innerWidth / GRID_SIZE
        const cellHeight = window.innerHeight / GRID_SIZE
        span.style.left = `${x * cellWidth + cellWidth / 2}px`
        span.style.top = `${y * cellHeight + cellHeight / 2}px`
      })
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
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        pointerEvents: 'none',
      }}
    />
  )
}
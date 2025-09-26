export function luminance(r: number, g: number, b: number): number {
  // sRGB luminance approximation in 0..255 space
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function adjustLuminance(
  L: number,
  opts: { brightness: number; contrast: number; invert: boolean; gamma?: number }
): number {
  const brightness = opts.brightness ?? 0 // -0.5..0.5
  const contrast = opts.contrast ?? 0 // -0.5..0.5
  const gamma = opts.gamma && opts.gamma > 0 ? opts.gamma : 1.0 // 0.5..2.5 typically
  const invert = !!opts.invert

  // Normalize to 0..1
  let t = L / 255

  // Apply brightness (add) and contrast (scale around 0.5)
  t = t + brightness
  t = (t - 0.5) * (1 + contrast * 2) + 0.5

  // Clamp 0..1
  t = Math.max(0, Math.min(1, t))

  // Gamma correction
  if (gamma !== 1) {
    t = Math.pow(t, gamma)
  }

  // Invert if needed
  if (invert) t = 1 - t

  return t * 255
}

export function indexForL(L: number, paletteLength: number): number {
  if (paletteLength <= 1) return 0
  const idx = Math.round((1 - L / 255) * (paletteLength - 1))
  return Math.max(0, Math.min(paletteLength - 1, idx))
}

// Returns hue in degrees [0, 360). If saturation is 0, returns 0.
export function rgbToHue(r: number, g: number, b: number): number {
  const rf = r / 255
  const gf = g / 255
  const bf = b / 255
  const max = Math.max(rf, gf, bf)
  const min = Math.min(rf, gf, bf)
  const delta = max - min
  if (delta === 0) return 0
  let h = 0
  if (max === rf) {
    h = ((gf - bf) / delta) % 6
  } else if (max === gf) {
    h = (bf - rf) / delta + 2
  } else {
    h = (rf - gf) / delta + 4
  }
  h *= 60
  if (h < 0) h += 360
  return h
}




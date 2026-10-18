import type {Node} from 'three/webgpu'

import {texture, vec2} from 'three/tsl'
import {ClampToEdgeWrapping, DataTexture, LinearFilter, RepeatWrapping, RGBAFormat, SRGBColorSpace, UnsignedByteType} from 'three/webgpu'

/** One full repeat of the retardance axis, in nanometers. Four visible orders at 550 nm. */
export const interferencePeriod = 2200
const sampleCount = 2048
const lobe = (wavelength: number, mean: number, below: number, above: number) => {
  const offset = wavelength - mean
  const sigma = offset < 0 ? below : above
  return Math.exp(-0.5 * (offset / sigma) ** 2)
}
const cie = (wavelength: number) => {
  const x = lobe(wavelength, 599.8, 37.9, 31) * 1.056 + lobe(wavelength, 442, 16, 26.7) * 0.362 - lobe(wavelength, 501.1, 20.4, 26.2) * 0.065
  const y = lobe(wavelength, 568.8, 46.9, 40.5) * 0.821 + lobe(wavelength, 530.9, 16.3, 31.1) * 0.286
  const z = lobe(wavelength, 437, 11.8, 36) * 1.217 + lobe(wavelength, 459, 26, 13.8) * 0.681
  return [x, y, z]
}
const linearSrgb = (x: number, y: number, z: number) => {
  const r = 3.2406 * x - 1.5372 * y - 0.4986 * z
  const g = -0.9689 * x + 1.8758 * y + 0.0415 * z
  const b = 0.0557 * x - 0.204 * y + 1.057 * z
  return [Math.max(0, r), Math.max(0, g), Math.max(0, b)]
}
const sRGB = (value: number) => (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055)
/**
 * RGB of light after passing crossed polarizers with retardance `R`: the spectrum is weighted by
 * sin²(πR/λ), integrated against the CIE 1931 observer. This is the real Michel-Lévy sequence –
 * black, pearl, straw, magenta, blue, green, yellow – not a hand-picked rainbow.
 */
const crossedPolarizers = (retardance: number) => {
  let x = 0
  let y = 0
  let z = 0
  let total = 0
  for (let wavelength = 380;wavelength <= 780;wavelength += 5) {
    const phase = Math.PI * retardance / wavelength
    const transmission = Math.sin(phase) ** 2
    const [cx, cy, cz] = cie(wavelength)
    x += transmission * cx
    y += transmission * cy
    z += transmission * cz
    total += transmission
  }
  return {
    rgb: linearSrgb(x, y, z),
    total,
  }
}
/**
 * A filterable one-dimensional LUT of photoelastic interference colors, encoded as sRGB bytes.
 * Hue comes from the integrated spectrum; brightness follows the transmitted energy with a gentle
 * gamma so low-order fringes still read on a dark sculpture. The texture repeats every
 * `interferencePeriod` nanometers; the first four orders are physically integrated.
 */
export function createInterferenceLut() {
  const raw: Array<ReturnType<typeof crossedPolarizers>> = []
  let peakChannel = 0
  let peakTotal = 0
  for (let index = 0;index < sampleCount;index++) {
    const retardance = index / (sampleCount - 1) * interferencePeriod
    const sample = crossedPolarizers(retardance)
    raw.push(sample)
    peakChannel = Math.max(peakChannel, sample.rgb[0], sample.rgb[1], sample.rgb[2])
    peakTotal = Math.max(peakTotal, sample.total)
  }
  const pixels = new Uint8Array(sampleCount * 4)
  for (const [index, sample] of raw.entries()) {
    const offset = index * 4
    const energy = peakTotal > 0 ? (sample.total / peakTotal) ** 0.42 : 0
    for (let channel = 0;channel < 3;channel++) {
      const hue = peakChannel > 0 ? sample.rgb[channel] / peakChannel : 0
      const value = Math.min(1, Math.max(0, hue * energy))
      pixels[offset + channel] = Math.round(255 * sRGB(value))
    }
    pixels[offset + 3] = 255
  }
  const lut = new DataTexture(pixels, sampleCount, 1, RGBAFormat, UnsignedByteType)
  lut.name = 'Photoelastic interference LUT'
  lut.colorSpace = SRGBColorSpace
  lut.wrapS = RepeatWrapping
  lut.wrapT = ClampToEdgeWrapping
  lut.minFilter = LinearFilter
  lut.magFilter = LinearFilter
  lut.generateMipmaps = false
  lut.needsUpdate = true
  return lut
}
/** Sample the interference LUT at a retardance in nanometers. */
export function interferenceColor(lut: DataTexture, retardance: Node<'float'>) {
  return texture(lut, vec2(retardance.div(interferencePeriod), 0.5)).rgb
}

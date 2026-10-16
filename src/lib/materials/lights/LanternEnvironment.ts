import {DataTexture, EquirectangularReflectionMapping, LinearFilter, RGBAFormat, SRGBColorSpace, UnsignedByteType} from 'three/webgpu'

const width = 64
const height = 32
/** sRGB colors from straight up to straight down: soot-dark rafters, lamp-warmed boarding, and floorboards a little brighter where the pools of light land. */
const stops = [
  [0, [26, 17, 11]],
  [0.42, [52, 33, 19]],
  [0.58, [60, 38, 21]],
  [1, [72, 45, 24]],
] as const

/** Linearly blends the stops at a height from 0 (zenith) to 1 (nadir). */
export function sample(elevation: number) {
  const t = Math.min(1, Math.max(0, elevation))
  const upper = stops.findIndex(([at]) => at >= t)
  if (upper === 0) {
    return [...stops[0][1]]
  }
  const [fromAt, from] = stops[upper - 1]
  const [toAt, to] = stops[upper]
  const blend = (t - fromAt) / (toAt - fromAt)
  return from.map((value, channel) => Math.round(value + (to[channel] - value) * blend))
}

/**
 * A near-black, warm surrounding for spaces lit by nothing but lamps.
 *
 * Glossy wood mirrors darkness rather than the gallery’s daylit sky, and surfaces beyond every lamp’s bounce light fall to a warm dusk instead of pure black.
 */
export default class LanternEnvironment extends DataTexture {
  constructor() {
    const data = new Uint8Array(width * height * 4)
    for (let row = 0; row < height; row++) {
      // Without flipY, the first row is the bottom of the equirectangular map.
      const color = sample(1 - (row + 0.5) / height)
      for (let column = 0; column < width; column++) {
        data.set([...color, 255], (row * width + column) * 4)
      }
    }
    super(data, width, height, RGBAFormat, UnsignedByteType, EquirectangularReflectionMapping)
    this.name = 'Lantern environment'
    this.colorSpace = SRGBColorSpace
    this.magFilter = LinearFilter
    this.minFilter = LinearFilter
    this.needsUpdate = true
  }
}

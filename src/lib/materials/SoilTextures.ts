import {SimplexNoise} from 'three/addons/math/SimplexNoise.js'
import {DataTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace} from 'three/webgpu'

const size = 512

function texture(pixels: Uint8Array, color = false) {
  const map = new DataTexture(pixels, size, size)
  if (color) map.colorSpace = SRGBColorSpace
  map.generateMipmaps = true
  map.minFilter = LinearMipmapLinearFilter
  map.magFilter = LinearFilter
  map.anisotropy = 16
  map.needsUpdate = true
  return map
}

/** Small soil crumbs, grit and mineral flecks over a dark, matte substrate. */
export class SoilTextures {
  readonly map: DataTexture
  readonly bumpMap: DataTexture

  constructor() {
    let seed = 541
    const random = () => {
      seed = seed * 1_664_525 + 1_013_904_223 >>> 0
      return seed / 4_294_967_296
    }
    const noise = new SimplexNoise({random})
    const colors = new Uint8Array(size * size * 4)
    const bumps = new Uint8Array(colors.length)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        const crumb = noise.noise(x / 7, y / 7)
        const grit = noise.noise(x / 1.8, y / 1.8)
        const grain = random()
        const mineral = grain > 0.985 ? (grain - 0.985) / 0.015 : 0
        const tone = 1 + crumb * 0.3 + grit * 0.18 + (grain - 0.5) * 0.16
        colors[i] = Math.round(54 * tone + mineral * 42)
        colors[i + 1] = Math.round(36 * tone + mineral * 34)
        colors[i + 2] = Math.round(22 * tone + mineral * 24)
        const relief = Math.round(128 + crumb * 36 + grit * 18 + mineral * 15)
        bumps[i] = bumps[i + 1] = bumps[i + 2] = relief
        colors[i + 3] = bumps[i + 3] = 255
      }
    }
    this.map = texture(colors, true)
    this.bumpMap = texture(bumps)
  }

  dispose() {
    this.map.dispose()
    this.bumpMap.dispose()
  }
}

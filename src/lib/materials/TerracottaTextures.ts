import {DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace} from 'three/webgpu'

const width = 1024
const height = 512
function texture(pixels: Uint8Array, color = false) {
  const map = new DataTexture(pixels, width, height)
  if (color) {
    map.colorSpace = SRGBColorSpace
  }
  map.wrapS = RepeatWrapping
  map.generateMipmaps = true
  map.minFilter = LinearMipmapLinearFilter
  map.magFilter = LinearFilter
  map.anisotropy = 16
  map.needsUpdate = true
  return map
}

/** Unglazed clay: fine surface grain, tiny pores and occasional pale mineral grains. */
export class TerracottaTextures {
  readonly bumpMap: DataTexture
  readonly map: DataTexture
  readonly roughnessMap: DataTexture

  constructor() {
    let seed = 183
    const random = () => {
      seed = seed * 1_664_525 + 1_013_904_223 >>> 0
      return seed / 4_294_967_296
    }
    const colors = new Uint8Array(width * height * 4)
    const bumps = new Uint8Array(colors.length)
    const roughness = new Uint8Array(colors.length)
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const i = (y * width + x) * 4
        // One texel spans roughly 2 mm around the pot, not a broad patch of clay.
        const fine = random() - 0.5
        const grain = random()
        const pore = grain < 0.018 ? (0.018 - grain) / 0.018 : 0
        const mineral = grain > 0.988 ? (grain - 0.988) / 0.012 : 0
        const tone = 1 + fine * 0.018 - pore * 0.18 + mineral * 0.06
        colors[i] = Math.round(180 * tone)
        colors[i + 1] = Math.round(114 * tone)
        colors[i + 2] = Math.round(73 * tone)
        const relief = Math.round(128 + fine * 6 - pore * 30 + mineral * 6)
        const matte = Math.round(222 + fine * 4 + pore * 18 - mineral * 5)
        for (let channel = 0; channel < 3; channel++) {
          bumps[i + channel] = relief
          roughness[i + channel] = matte
        }
        colors[i + 3] = bumps[i + 3] = roughness[i + 3] = 255
      }
    }
    this.map = texture(colors, true)
    this.bumpMap = texture(bumps)
    this.roughnessMap = texture(roughness)
  }

  dispose() {
    this.map.dispose()
    this.bumpMap.dispose()
    this.roughnessMap.dispose()
  }
}

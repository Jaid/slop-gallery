import {DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace} from 'three/webgpu'

const size = 512
const wrap = (value: number, period: number) => (value % period + period) % period
const fade = (value: number) => value * value * value * (value * (value * 6 - 15) + 10)
const mix = (a: number, b: number, weight: number) => a + (b - a) * weight
function noise(u: number, v: number, frequency: number) {
  const x = u * frequency
  const y = v * frequency
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const hash = (x: number, y: number) => {
    let n = Math.imul(wrap(x, frequency), 374_761_393) ^ Math.imul(wrap(y, frequency), 668_265_263) ^ 91
    n = Math.imul(n ^ n >>> 13, 1_274_126_177)
    return ((n ^ n >>> 16) >>> 0) / 4_294_967_295
  }
  return mix(mix(hash(ix, iy), hash(ix + 1, iy), fade(x - ix)), mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), fade(x - ix)), fade(y - iy))
}
function grain(u: number, v: number, frequency: number) {
  let value = 0
  let amplitude = 0.5
  for (let octave = 0; octave < 4; octave++) {
    value += noise(u, v, frequency) * amplitude
    frequency *= 2
    amplitude *= 0.5
  }
  return value / 0.9375
}
function texture(pixels: Uint8Array, color = false) {
  const map = new DataTexture(pixels, size, size)
  if (color) {
    map.colorSpace = SRGBColorSpace
  }
  map.wrapS = map.wrapT = RepeatWrapping
  map.repeat.set(3, 1)
  map.generateMipmaps = true
  map.minFilter = LinearMipmapLinearFilter
  map.magFilter = LinearFilter
  map.anisotropy = 16
  map.needsUpdate = true
  return map
}

/** Owned, deterministic gold maps with periodic grain and matching UV scales. */
export default class GoldTextures {
  readonly map: DataTexture
  readonly normal: DataTexture

  constructor() {
    const colors = new Uint8Array(size * size * 4)
    const normals = new Uint8Array(size * size * 4)
    const heights = new Float32Array(size * size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        const n = grain(x / size, y / size, 10)
        colors[i] = Math.round(mix(0.72, 0.92, n) * 255)
        colors[i + 1] = Math.round(mix(0.54, 0.78, n) * 255)
        colors[i + 2] = Math.round(mix(0.22, 0.42, n) * 255)
        colors[i + 3] = 255
        heights[y * size + x] = grain(x / size, y / size, 16)
      }
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (heights[y * size + wrap(x + 1, size)] - heights[y * size + wrap(x - 1, size)]) * 2
        const dy = (heights[wrap(y + 1, size) * size + x] - heights[wrap(y - 1, size) * size + x]) * 2
        const length = Math.hypot(dx, dy, 1)
        const i = (y * size + x) * 4
        normals[i] = Math.round((0.5 - dx / length * 0.5) * 255)
        normals[i + 1] = Math.round((0.5 - dy / length * 0.5) * 255)
        normals[i + 2] = Math.round((0.5 + 1 / length * 0.5) * 255)
        normals[i + 3] = 255
      }
    }
    this.map = texture(colors, true)
    this.normal = texture(normals)
  }

  dispose() {
    this.map.dispose()
    this.normal.dispose()
  }
}

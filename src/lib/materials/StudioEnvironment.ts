import {DataTexture, EquirectangularReflectionMapping, FloatType, LinearFilter, RepeatWrapping, RGBAFormat} from 'three/webgpu'

function panel(u: number, v: number, center: number, halfWidth: number, centerY: number, halfHeight: number) {
  const dx = Math.min(Math.abs(u - center), 1 - Math.abs(u - center)) / halfWidth
  const dy = Math.abs(v - centerY) / halfHeight
  return Math.exp(-(dx ** 4) - dy ** 4)
}

/** Linear radiance from a softly lit studio, warm softboxes and a cool strip light – no assets. */
export class StudioEnvironment extends DataTexture {
  constructor() {
    const width = 512
    const height = 256
    const pixels = new Float32Array(width * height * 4)
    for (let y = 0; y < height; y++) {
      const v = (y + 0.5) / height
      for (let x = 0; x < width; x++) {
        const u = (x + 0.5) / width
        const warm = panel(u, v, 0.2, 0.115, 0.28, 0.16) * 3.2
        const cool = panel(u, v, 0.62, 0.035, 0.4, 0.2) * 3.8
        const fill = panel(u, v, 0.82, 0.13, 0.24, 0.12) * 1.8
        const base = 0.12 + 0.25 * (1 - v) ** 1.5
        const i = (y * width + x) * 4
        pixels[i] = base + warm + cool * 0.85 + fill
        pixels[i + 1] = base + warm * 0.9 + cool * 0.94 + fill
        pixels[i + 2] = base + warm * 0.88 + cool + fill
        pixels[i + 3] = 1
      }
    }
    super(pixels, width, height, RGBAFormat, FloatType)
    this.name = 'Procedural studio softboxes'
    this.mapping = EquirectangularReflectionMapping
    this.wrapS = RepeatWrapping
    this.minFilter = LinearFilter
    this.magFilter = LinearFilter
    this.needsUpdate = true
  }
}

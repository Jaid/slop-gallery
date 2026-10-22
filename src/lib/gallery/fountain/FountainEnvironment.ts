import {DataTexture, EquirectangularReflectionMapping, FloatType, LinearFilter, RepeatWrapping, RGBAFormat} from 'three/webgpu'

/** A static, procedural skylit hall for water reflections. This is deliberately not a live reflection of the Lobby or its artwork. */
export default class FountainEnvironment extends DataTexture {
  constructor() {
    const width = 512
    const height = 256
    const pixels = new Float32Array(width * height * 4)
    for (let y = 0; y < height; y++) {
      const elevation = ((y + 0.5) / height - 0.5) * Math.PI
      const up = Math.sin(elevation)
      for (let x = 0; x < width; x++) {
        const azimuth = ((x + 0.5) / width - 0.5) * Math.PI * 2
        const dx = Math.cos(elevation) * Math.cos(azimuth)
        const dz = Math.cos(elevation) * Math.sin(azimuth)
        // Broad arcade openings give grazing water reflections structure instead of a flat beige horizon.
        const arcade = Math.max(0, Math.cos(azimuth * 8)) ** 4 * Math.exp(-(((up - 0.25) / 0.22) ** 4))
        let radiance: readonly [number, number, number] = up < 0 ? [0.09, 0.13, 0.12] : [0.32 + arcade * 1.2, 0.28 + arcade * 1.35, 0.21 + arcade * 1.5]
        if (up > 0.02) {
          const sx = dx * 8 / up
          const sz = dz * 8 / up
          if (Math.abs(sx) < 3.8 && Math.abs(sz) < 18) {
            const frame = Math.abs(sx) < 0.08 || Math.abs(sz / 3 - Math.round(sz / 3)) < 0.035
            radiance = frame ? [0.12, 0.14, 0.13] : [1.3, 1.65, 2.1]
          }
        }
        const index = (y * width + x) * 4
        pixels[index] = radiance[0]
        pixels[index + 1] = radiance[1]
        pixels[index + 2] = radiance[2]
        pixels[index + 3] = 1
      }
    }
    super(pixels, width, height, RGBAFormat, FloatType)
    this.name = 'Procedural fountain skylight reflections'
    this.mapping = EquirectangularReflectionMapping
    this.wrapS = RepeatWrapping
    this.minFilter = LinearFilter
    this.magFilter = LinearFilter
    this.needsUpdate = true
  }
}

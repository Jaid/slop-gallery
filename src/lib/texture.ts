import {DataTexture, LinearFilter, LinearMipmapLinearFilter, RGBAFormat, SRGBColorSpace, UnsignedByteType} from 'three/webgpu'

/** Upload owned pixels rather than a browser-managed external image resource. */
export function canvasTexture(canvas: HTMLCanvasElement, color = true) {
  const context = canvas.getContext('2d', {willReadFrequently: true})!
  const data = context.getImageData(0, 0, canvas.width, canvas.height)
  const texture = new DataTexture(new Uint8Array(data.data.buffer), canvas.width, canvas.height, RGBAFormat, UnsignedByteType)
  if (color) {
    texture.colorSpace = SRGBColorSpace
  }
  texture.flipY = true
  texture.generateMipmaps = true
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}

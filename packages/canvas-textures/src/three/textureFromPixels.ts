import type {CanvasPixels} from '../types.ts'
import type {CanvasTextureOptions} from './types.ts'

import {DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RGBAFormat, SRGBColorSpace, UnsignedByteType} from 'three/webgpu'

import {validateCanvasSize} from '../ReadbackCanvas.ts'

/** Transfers pixel ownership to the texture by reference; no copy or external-image upload. */
export default function textureFromPixels({data, width, height}: CanvasPixels, {color = true, mipmaps = true, anisotropy = 16, name = ''}: CanvasTextureOptions = {}) {
  validateCanvasSize(width, height)
  if (data.byteLength !== width * height * 4) {
    throw new RangeError('Canvas texture pixels must contain exactly width × height × 4 RGBA8 bytes.')
  }
  const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType)
  texture.name = name
  texture.colorSpace = color ? SRGBColorSpace : NoColorSpace
  texture.flipY = true
  texture.generateMipmaps = mipmaps
  texture.magFilter = LinearFilter
  texture.minFilter = mipmaps ? LinearMipmapLinearFilter : LinearFilter
  texture.anisotropy = mipmaps ? anisotropy : 1
  texture.needsUpdate = true
  return texture
}

import type {CanvasTextureOptions} from './types.ts'

import {LinearFilter, LinearMipmapLinearFilter, NoColorSpace, SRGBColorSpace, Texture} from 'three/webgpu'

/** Owns its external image until disposal; keep it alive for uploads and device recovery. */
export default function textureFromImage<T extends HTMLCanvasElement | ImageBitmap>(image: T, release: () => void, {color = true, mipmaps = true, anisotropy = 16, name = ''}: CanvasTextureOptions) {
  const texture = new Texture(image)
  texture.name = name
  texture.colorSpace = color ? SRGBColorSpace : NoColorSpace
  texture.flipY = true
  texture.premultiplyAlpha = false
  texture.generateMipmaps = mipmaps
  texture.magFilter = LinearFilter
  texture.minFilter = mipmaps ? LinearMipmapLinearFilter : LinearFilter
  texture.anisotropy = mipmaps ? anisotropy : 1
  const dispose = () => {
    texture.removeEventListener('dispose', dispose)
    release()
  }
  texture.addEventListener('dispose', dispose)
  texture.needsUpdate = true
  return texture
}

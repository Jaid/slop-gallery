import {LinearMipmapLinearFilter, SRGBColorSpace} from 'three/webgpu'

import canvasTexture from './texture.ts'

/** URL loads can fail while the dev server restarts; never permanently cache that failure. */
export default async function loadArtworkTexture(source: Blob | string, retryDelay = 500) {
  const attempts = typeof source === 'string' ? 3 : 1
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = typeof source === 'string' ? await fetch(source, {signal: AbortSignal.timeout(20_000)}) : null
      if (response && !response.ok && typeof source === 'string') {
        throw new Error(`Artwork image HTTP ${response.status}: ${source}`)
      }
      const bitmap = await createImageBitmap(response ? await response.blob() : source as Blob)
      try {
        const scale = Math.min(1, 3072 / Math.max(bitmap.width, bitmap.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(bitmap.width * scale))
        canvas.height = Math.max(1, Math.round(bitmap.height * scale))
        const context = canvas.getContext('2d')!
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        const texture = canvasTexture(canvas)
        texture.colorSpace = SRGBColorSpace
        texture.minFilter = LinearMipmapLinearFilter
        texture.anisotropy = 16
        return texture
      } finally {
        bitmap.close()
      }
    } catch (error) {
      if (attempt === attempts - 1) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay * 2 ** attempt))
    }
  }
  throw new Error('Artwork texture could not be loaded.')
}

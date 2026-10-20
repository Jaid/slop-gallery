import '#src/lib/diagnostics.ts'

import {galleryLevel} from './level.ts'

export type FrameDownload = {
  /** encoded size in bytes */
  bytes: number
  fileName: string
  height: number
  width: number
}

const defaultName = () => {
  const now = new Date
  return `${galleryLevel}-${now.toISOString().replaceAll(/[.:]/gu, '-').replace(/-\d{3}Z$/u, '')}`
}

/** Download the current frame as lossless `<name>.webp`, by default `<level>-<timestamp>.webp`. Rejects when the capture is not mounted or encoding fails. */
export default async function downloadFrame(name = defaultName()): Promise<FrameDownload> {
  const capturePixels = globalThis.slopGallery?.capturePixels
  if (!capturePixels) {
    throw new Error('WebGPU capture is not mounted.')
  }
  const {pixels, width, height} = await capturePixels()
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not create a 2D canvas context for the frame download.')
  }
  context.putImageData(new ImageData(pixels, width, height), 0, 0)
  // Chromium encodes WebP losslessly at quality 1. Browsers without a WebP encoder silently return PNG.
  const blob = await canvas.convertToBlob({
    type: 'image/webp',
    quality: 1,
  })
  if (blob.type !== 'image/webp') {
    throw new Error('The browser could not encode the frame as WebP.')
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${name}.webp`
  link.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
  })
  return {
    fileName: link.download,
    width,
    height,
    bytes: blob.size,
  }
}

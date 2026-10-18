import '#src/lib/diagnostics.ts'

/** Download the current frame as lossless `<level>-<dump id>.webp` so it can be matched with its ego.dump records. Rejects when the capture or encoding fails. */
export default async function saveDumpScreenshot(name: string) {
  const capturePixels = globalThis.slopGallery?.capturePixels
  if (!capturePixels) {
    console.warn('Dump screenshot skipped: WebGPU capture is not mounted.')
    return
  }
  const {pixels, width, height} = await capturePixels()
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not create a 2D canvas context for the dump screenshot.')
  }
  context.putImageData(new ImageData(pixels, width, height), 0, 0)
  // Chromium encodes WebP losslessly at quality 1. Browsers without a WebP encoder silently return PNG.
  const blob = await new Promise<Blob | null>(resolve => {
    canvas.toBlob(resolve, 'image/webp', 1)
  })
  if (blob?.type !== 'image/webp') {
    throw new Error('The browser could not encode the dump screenshot as WebP.')
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${name}.webp`
  link.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
  })
  console.info(`Dump screenshot saved as ${link.download} (${width}×${height}, ${blob.size} bytes).`)
}

import '#src/lib/diagnostics.ts'

import downloadFrame from '../downloadFrame.ts'

/** Download the current frame as lossless `<level>-<dump id>.webp` so it can be matched with its ego.dump records. Rejects when the capture or encoding fails. */
export default async function saveDumpScreenshot(name: string) {
  if (!globalThis.slopGallery?.capturePixels) {
    console.warn('Dump screenshot skipped: WebGPU capture is not mounted.')
    return
  }
  const {fileName, width, height, bytes} = await downloadFrame(name)
  console.info(`Dump screenshot saved as ${fileName} (${width}×${height}, ${bytes} bytes).`)
}

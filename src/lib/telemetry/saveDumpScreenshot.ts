import '#src/lib/diagnostics.ts'

/** Download the current frame as `<level>-<dump id>.png` so it can be matched with its ego.dump records. */
export default async function saveDumpScreenshot(name: string) {
  const captureFrame = globalThis.__gallery?.captureFrame
  if (!captureFrame) {
    console.warn('Dump screenshot skipped: WebGPU capture is not mounted.')
    return
  }
  try {
    const {dataUrl, width, height} = await captureFrame()
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `${name}.png`
    link.click()
    console.info(`Dump screenshot saved as ${link.download} (${width}×${height}).`)
  } catch (error) {
    console.warn('Dump screenshot could not be captured.', error)
  }
}

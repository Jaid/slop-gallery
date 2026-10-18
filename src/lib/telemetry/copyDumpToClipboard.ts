import '#src/lib/diagnostics.ts'

/** Copy an X-key dump as one clipboard item: the Clank text for text targets and the current frame as PNG for image targets. Falls back to the text alone when the frame cannot be captured. Rejects when the clipboard refuses. */
export default async function copyDumpToClipboard(clank: string) {
  const captureFrame = globalThis.slopGallery?.captureFrame
  if (!captureFrame) {
    console.warn('Dump screenshot skipped: WebGPU capture is not mounted.')
    await copyText(clank)
    return
  }
  // Pass the pending frame so the write starts synchronously within the X keypress’ user activation.
  const image = captureFrame().then(async ({dataUrl, width, height}) => {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    console.info(`Dump screenshot captured (${width}×${height}).`)
    return blob
  })
  try {
    await navigator.clipboard.write([new ClipboardItem({
      'text/plain': new Blob([clank], {type: 'text/plain'}),
      'image/png': image,
    })])
    console.info(`Dump copied to the clipboard as Clank text (${clank.length} characters) and PNG.`)
  } catch (error) {
    console.warn('Dump screenshot could not be copied, falling back to the Clank text alone.', error)
    await copyText(clank)
  }
}
async function copyText(clank: string) {
  await navigator.clipboard.writeText(clank)
  console.info(`Dump copied to the clipboard as Clank text (${clank.length} characters).`)
}

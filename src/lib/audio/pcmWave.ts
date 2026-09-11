/** Gemini TTS emits mono 16-bit little-endian PCM at 24 kHz. Add a lossless WAV container. */
export function pcmWave(pcm: ArrayBuffer, sampleRate = 24_000) {
  if (!pcm.byteLength || pcm.byteLength % 2 || !Number.isSafeInteger(sampleRate) || sampleRate <= 0) {
    throw new Error('Invalid PCM audio.')
  }
  const header = new ArrayBuffer(44)
  const bytes = new Uint8Array(header)
  const view = new DataView(header)
  const text = (offset: number, value: string) => bytes.set((new TextEncoder).encode(value), offset)
  text(0, 'RIFF')
  view.setUint32(4, 36 + pcm.byteLength, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, pcm.byteLength, true)
  return new Blob([header, pcm], {type: 'audio/wav'})
}

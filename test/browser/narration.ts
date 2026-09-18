import {audioFile} from 'use-audio-queue/browser'
import {AudioQueue} from 'use-audio-queue/core'

function silentWave(duration: number) {
  const rate = 8000
  const length = Math.ceil(rate * duration) * 2
  const buffer = new ArrayBuffer(44 + length)
  const view = new DataView(buffer)
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i))
    }
  }
  text(0, 'RIFF')
  view.setUint32(4, 36 + length, true)
  text(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, length, true)
  return new Blob([buffer], {type: 'audio/wav'})
}
const assert = (value: unknown, message: string) => {
  if (!value) {
    throw new Error(message)
  }
}
/** Real muted media elements; no native speech, app audio, input, navigation, focus or resizing. */
export default async function verify() {
  const queue = new AudioQueue({
    gap: 0.01,
    prependedSilence: 0.01,
    appendedSilence: 0.01,
  })
  const media: Array<HTMLAudioElement> = []
  let disconnected = 0
  const options = {
    volume: 0,
    connect: (audio: HTMLAudioElement) => {
      media.push(audio)
      return () => {
        disconnected++
      }
    },
  }
  const timeout = AbortSignal.timeout(10_000)
  try {
    const original = queue.push(audioFile(silentWave(0.8), options), {signal: timeout})
    await waitFor(() => media.length === 1 && media[0].currentTime > 0.06 && !media[0].paused)
    const first = media[0]
    const position = first.currentTime
    const inserted = queue.push(audioFile(silentWave(0.1), options), {
      priority: 'inject',
      signal: timeout,
    })
    assert(first.paused, 'Injection did not immediately pause the original media element.')
    const insertedResult = await inserted.finished
    assert(insertedResult.status === 'completed', `Injected media failed: ${JSON.stringify(insertedResult)}`)
    await waitFor(() => !first.paused)
    assert(media[0] === first && media.length === 2, 'Resume replaced the original media element.')
    assert(first.currentTime >= position - 0.02, 'Resume lost the saved playback position.')
    const resumedPosition = first.currentTime
    const originalResult = await original.finished
    assert(originalResult.status === 'completed', `Original media failed: ${JSON.stringify(originalResult)}`)
    assert(queue.getSnapshot().idle, 'Serial lane did not become idle.')
    assert(disconnected === 2 && media.every(audio => !audio.getAttribute('src')), 'Completed media resources were not released.')
    const serial = queue.push(audioFile(silentWave(0.25), options), {signal: timeout})
    const parallel = queue.push(audioFile(silentWave(0.25), options), {
      priority: 'async',
      signal: timeout,
    })
    await waitFor(() => media.length === 4 && !media[2].paused && !media[3].paused)
    const results = await Promise.all([serial.finished, parallel.finished])
    assert(results.every(result => result.status === 'completed'), 'Explicit concurrent playback failed.')
    assert(disconnected === 4 && media.every(audio => audio.paused && !audio.getAttribute('src')), 'Concurrent media resources leaked.')
    return {
      passed: true,
      muted: true,
      preservedMediaElement: true,
      pausedAt: position,
      resumedAt: resumedPosition,
      completedMedia: disconnected,
      concurrentPlayback: true,
    }
  } finally {
    queue.dispose()
  }
}

async function waitFor(condition: () => boolean) {
  const deadline = performance.now() + 5000
  while (!condition()) {
    assert(performance.now() < deadline, 'Timed out waiting for muted browser playback.')
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

import {narrationMeter} from './NarrationMeter.ts'
import SoundEngine from './SoundEngine.ts'

/** Plays a local recording and resolves on completion, not merely when playback starts. */
export default async function playAnnouncement(url: string, signal: AbortSignal, onPlaying: () => void) {
  signal.throwIfAborted()
  const sound = SoundEngine.get()
  await sound.resume()
  signal.throwIfAborted()
  const audio = new Audio(url)
  audio.volume = 0.85
  const disconnect = narrationMeter.connect(audio, sound.context)
  const playback = Promise.withResolvers<void>()
  let settled = false
  const settle = (error?: unknown) => {
    if (settled) {
      return
    }
    settled = true
    if (error === undefined) {
      playback.resolve()
    } else {
      playback.reject(error)
    }
  }
  const abort = () => settle(signal.reason)
  const ended = () => settle()
  const failed = () => settle(new Error('The announcement could not be played.'))
  signal.addEventListener('abort', abort, {once: true})
  audio.addEventListener('ended', ended, {once: true})
  audio.addEventListener('error', failed, {once: true})
  const start = async () => {
    try {
      await audio.play()
      if (!settled && !signal.aborted) {
        onPlaying()
      }
    } catch (error) {
      settle(error)
    }
  }
  try {
    void start()
    await playback.promise
  } finally {
    signal.removeEventListener('abort', abort)
    audio.removeEventListener('ended', ended)
    audio.removeEventListener('error', failed)
    audio.pause()
    disconnect()
    audio.removeAttribute('src')
    audio.load()
  }
}

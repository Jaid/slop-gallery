import {narrationState, Narrator} from 'use-narrator/core'

import {galleryEvents, notify} from '../gallery/actions.ts'
import {useGallery} from '../gallery/store.ts'
import {narrationMeter} from './NarrationMeter.ts'
import SoundEngine from './SoundEngine.ts'

/** The one application-owned narrator. Timing values are seconds. */
export const narrator = new Narrator({
  enabled: false,
  gap: 0.15,
  prependedSilence: 0.12,
  appendedSilence: 0.25,
  audio: {
    volume: 0.85,
    prepare: () => SoundEngine.get().resume(),
    connect: audio => narrationMeter.connect(audio, SoundEngine.get().context),
  },
  onError: error => notify(Error.isError(error) ? error.message : 'The narration could not be played.'),
  onFallback: () => notify('The recorded voice is unavailable. Using the browser voice instead.'),
})

/** Gallery-specific mute, navigation and telemetry projection. Playback state lives in the package. */
export function attachNarration(target: Narrator = narrator, events: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> = globalThis) {
  target.enabled = useGallery.getState().sound
  const publish = () => {
    const next = narrationState(target.getSnapshot())
    const previous = useGallery.getState().narration
    if (next?.id !== previous?.id || next?.title !== previous?.title || next?.text !== previous?.text || next?.source !== previous?.source || next?.status !== previous?.status) {
      useGallery.setState({narration: next})
    }
  }
  const unsubscribeNarrator = target.subscribe(publish)
  const unsubscribeGallery = useGallery.subscribe((state, previous) => {
    if (state.sound !== previous.sound) {
      target.enabled = state.sound
    }
  })
  const stop = () => target.stop()
  galleryEvents.addEventListener('stop-narration', stop)
  galleryEvents.addEventListener('teleport', stop)
  events.addEventListener('pagehide', stop)
  publish()
  return () => {
    unsubscribeGallery()
    galleryEvents.removeEventListener('stop-narration', stop)
    galleryEvents.removeEventListener('teleport', stop)
    events.removeEventListener('pagehide', stop)
    target.enabled = false
    unsubscribeNarrator()
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => narrator.dispose())
}

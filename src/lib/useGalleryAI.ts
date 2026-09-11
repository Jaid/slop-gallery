import type {Portrait} from './gallery.ts'

import {useQueryStates} from 'nuqs'
import {useEffect} from 'react'

import GalleryDirector from './ai/GalleryDirector.ts'
import parameterParsers from './ai/settings.ts'
import SoundEngine from './audio/SoundEngine.ts'
import {galleryEvents, notify, useGallery} from './gallery.ts'

export {default as parameterParsers} from './ai/settings.ts'

export default function useGalleryAI() {
  const [params, setParams] = useQueryStates(parameterParsers)
  const key = useGallery(s => s.apiKey)
  useEffect(() => {
    useGallery.setState({ai: params.ai})
  }, [params.ai])
  useEffect(() => {
    const director = new GalleryDirector(params, key)
    const imported = (event: Event) => void director.flavor((event as CustomEvent<Portrait>).detail).catch(() => notify('The label could not be prepared.'))
    const narrate = (event: Event) => void director.narrator.speak((event as CustomEvent<string>).detail).catch(() => notify('The story could not be played.'))
    const merge = (event: Event) => {
      const [a, b] = (event as CustomEvent<[string, string]>).detail
      void director.merge(a, b).catch(() => notify('The fusion could not be started.'))
    }
    const stop = () => director.narrator.stop()
    const unsubscribe = useGallery.subscribe(s => {
      SoundEngine.existing()?.mute(!s.sound)
    })
    galleryEvents.addEventListener('imported', imported)
    galleryEvents.addEventListener('narrate', narrate)
    galleryEvents.addEventListener('merge', merge)
    galleryEvents.addEventListener('stop-narration', stop)
    return () => {
      unsubscribe()
      galleryEvents.removeEventListener('imported', imported)
      galleryEvents.removeEventListener('narrate', narrate)
      galleryEvents.removeEventListener('merge', merge)
      galleryEvents.removeEventListener('stop-narration', stop)
      director.dispose()
    }
  }, [key, params.ai, params.text_model, params.text_model_effort, params.image_model, params.audio_model, params.narrator_voice, params.narrator_character, params.eager_audio])
  return {
    params,
    setParams,
  }
}

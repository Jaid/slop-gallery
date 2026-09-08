import type {Portrait} from './gallery.ts'

import {useQueryStates} from 'nuqs'
import {useEffect} from 'react'

import {GalleryDirector} from './ai/GalleryDirector.ts'
import {parameterParsers} from './ai/settings.ts'
import {SoundEngine} from './audio/SoundEngine.ts'
import {galleryEvents, isTextInput, useGallery} from './gallery.ts'
import {ImageImporter} from './gallery/ImageImporter.ts'

export {parameterParsers} from './ai/settings.ts'

export default function useGalleryAI() {
  const [params, setParams] = useQueryStates(parameterParsers)
  const key = useGallery(s => s.apiKey)
  useEffect(() => {
    useGallery.setState({ai: params.ai})
  }, [params.ai])
  useEffect(() => {
    const director = new GalleryDirector(params, key)
    const imported = (event: Event) => void director.flavor((event as CustomEvent<Portrait>).detail)
    const narrate = (event: Event) => void director.narrator.speak((event as CustomEvent<string>).detail)
    const merge = (event: Event) => {
      const [a, b] = (event as CustomEvent<[string, string]>).detail
      void director.merge(a, b)
    }
    const stop = () => director.narrator.stop()
    const unsubscribe = useGallery.subscribe((s, before) => {
      SoundEngine.existing()?.mute(!s.sound)
      if (!s.sound && before.sound || s.revision !== before.revision && s.narration && !s.portraits.some(p => p.id === s.narration?.id)) {
        stop()
      }
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
  useEffect(() => {
    const importer = new ImageImporter(p => galleryEvents.dispatchEvent(new CustomEvent('imported', {detail: p})))
    useGallery.setState({importFiles: (files, target) => importer.import(files, target)})
    const paste = (event: ClipboardEvent) => {
      if (isTextInput(event.target)) {
        return
      }
      const files = [...event.clipboardData?.files ?? []].filter(file => file.type.startsWith('image/'))
      if (files.length) {
        event.preventDefault()
        void importer.import(files)
      }
    }
    document.addEventListener('paste', paste)
    return () => {
      importer.dispose()
      document.removeEventListener('paste', paste)
      useGallery.setState({importFiles: null})
    }
  }, [])
  return {
    params,
    setParams,
  }
}

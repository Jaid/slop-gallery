import type {AiSettings} from '../ai/settings.ts'

import NarrationGenerator from '../ai/NarrationGenerator.ts'
import {notify} from '../gallery/actions.ts'
import {useGallery} from '../gallery/store.ts'
import {narrationMeter} from './NarrationMeter.ts'
import {SoundEngine} from './SoundEngine.ts'

export const intro = {
  id: '__intro',
  title: 'Welcome to Slop Gallery',
  description: 'Where the art is questionable and the insurance is imaginary. Take a walk, touch the paintings and bring a little of your own chaos. The curator has already left.',
}

export class Narrator {
  private audio: HTMLAudioElement | undefined
  private cache = new Map<string, Blob>
  private controller = new AbortController
  private disconnectAudio: (() => void) | undefined
  private jobs = new Map<string, Promise<Blob>>
  private speakingId: string | undefined
  private unsubscribe: () => void
  private url: string | undefined

  private version = 0
  private waiting: string | undefined

  constructor(private settings: AiSettings, private key: string) {
    this.unsubscribe = useGallery.subscribe((s, before) => {
      const id = s.narration?.id
      if (!id || id !== this.speakingId) {
        return
      }
      const p = s.portraits.find(p => p.id === id)
      const previous = before.portraits.find(p => p.id === id)
      if (!s.sound || id !== intro.id && !p) {
        this.stop()
      } else if (this.waiting === id) {
        // Both generated completion and a manual label edit release queued narration.
        if (p && !p.pending && !p.merging) {
          this.ready(id)
        }
      } else if (p?.pending || p?.merging) {
        void this.speak(id).catch(() => notify('The story could not be played.'))
      } else if (p && previous && (p.title !== previous.title || p.description !== previous.description || p.source !== previous.source || p.narration !== previous.narration)) {
        this.stop()
      }
    })
  }

  dispose() {
    this.unsubscribe()
    this.stop()
    this.controller.abort()
    this.cache.clear()
  }

  ready(id: string) {
    if (this.waiting === id) {
      void this.speak(id).catch(() => notify('The story could not be played.'))
    } else if (this.settings.eager_audio) {
      void this.speak(id, false).catch(() => notify('The story could not be prepared.'))
    }
  }

  async speak(id: string, play = true) {
    const s = useGallery.getState()
    const p = id === '__intro' ? {
      ...intro,
      pending: false,
      merging: false,
      narration: undefined,
    } : s.portraits.find(p => p.id === id)
    if (!p || !s.sound || this.controller.signal.aborted) {
      return
    }
    if (play) {
      this.stop()
      this.speakingId = id
    }
    const version = this.version
    if (p.pending || p.merging) {
      if (play) {
        this.waiting = id
        useGallery.setState({
          narration: {
            id,
            status: 'preparing',
            source: null,
          },
        })
        notify('The narrator is waiting for the ink to dry…')
      }
      return
    }
    const current = () => !this.controller.signal.aborted && this.version === version && useGallery.getState().sound
    const transcript = `${p.title.replace(/[!.?]$/, '')}. ${p.description.trim()}${/[!.?]$/.test(p.description.trim()) ? '' : '.'}`
    if (play) {
      useGallery.setState({
        narration: {
          id,
          status: 'preparing',
          source: null,
        },
      })
    }
    let failed = false
    const fallback = (error: unknown) => {
      if (!play || !current() || failed) {
        return
      }
      failed = true
      this.clearAudio()
      notify(error instanceof Error ? `${error.message} Using the browser voice instead.` : 'Using the browser voice instead.')
      this.browserSpeech(id, transcript, current)
    }
    try {
      let blob: Blob | undefined
      if (p.narration) {
        const response = await fetch(p.narration, {signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(20_000)])})
        if (!response.ok) {
          throw new Error('The recorded narration could not be loaded.')
        }
        blob = await response.blob()
      } else if (this.settings.ai && this.key) {
        const cacheKey = `${id}:${transcript}`
        blob = this.cache.get(cacheKey)
        if (!blob) {
          let job = this.jobs.get(cacheKey)
          if (!job) {
            job = this.generate(transcript)
            this.jobs.set(cacheKey, job)
          }
          try {
            blob = await job
            if (this.cache.size >= 24) {
              this.cache.delete(this.cache.keys().next().value!)
            }
            this.cache.set(cacheKey, blob)
          } finally {
            if (this.jobs.get(cacheKey) === job) {
              this.jobs.delete(cacheKey)
            }
          }
        }
      }
      if (!play || !current()) {
        return
      }
      if (blob) {
        const sound = SoundEngine.get()
        await sound.resume()
        if (!current()) {
          return
        }
        this.url = URL.createObjectURL(blob)
        const audio = this.audio = new Audio(this.url)
        audio.volume = 0.85
        this.disconnectAudio = narrationMeter.connect(audio, sound.context)
        audio.addEventListener('ended', () => {
          if (current() && !failed) {
            this.stop()
          }
        })
        audio.onerror = () => fallback(new Error('Audio playback failed.'))
        await audio.play()
        if (current() && !failed) {
          useGallery.setState({
            narration: {
              id,
              status: 'playing',
              source: 'audio',
            },
          })
        }
      } else {
        this.browserSpeech(id, transcript, current)
      }
    } catch (error) {
      fallback(error)
    }
  }

  stop() {
    this.version++
    this.waiting = undefined
    this.clearAudio()
    globalThis.speechSynthesis?.cancel()
    if (this.speakingId && useGallery.getState().narration?.id === this.speakingId) {
      useGallery.setState({narration: null})
    }
    this.speakingId = undefined
  }

  private browserSpeech(id: string, text: string, current: () => boolean) {
    if (!globalThis.speechSynthesis) {
      this.stop()
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    const voices = speechSynthesis.getVoices()
    utterance.voice = voices.find(v => v.lang.includes('en-GB') && v.localService) ?? voices.find(v => v.lang.startsWith('en')) ?? null
    utterance.rate = 0.91
    utterance.onstart = () => {
      if (current()) {
        useGallery.setState({
          narration: {
            id,
            status: 'playing',
            source: 'browser',
          },
        })
      }
    }
    utterance.onend = () => {
      if (current()) {
        this.stop()
      }
    }
    utterance.onerror = event => {
      if (current()) {
        this.stop()
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          notify('The browser voice is unavailable. You can still read the story.')
        }
      }
    }
    speechSynthesis.speak(utterance)
  }

  private clearAudio() {
    if (this.audio) {
      this.audio.onerror = null
    }
    this.audio?.pause()
    this.disconnectAudio?.()
    this.disconnectAudio = undefined
    this.audio = undefined
    if (this.url) {
      URL.revokeObjectURL(this.url)
    }
    this.url = undefined
  }

  private async generate(input: string) {
    await SoundEngine.get().resume()
    return new NarrationGenerator(this.key, this.settings.audio_model, this.settings.narrator_voice).generate(input, {
      signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(90_000)]),
      character: this.settings.narrator_character,
    })
  }
}

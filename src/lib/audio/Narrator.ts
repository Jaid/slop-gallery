import type {AiSettings} from '../ai/settings.ts'

import {notify} from '../gallery/actions.ts'
import {useGallery} from '../gallery/store.ts'
import {SoundEngine} from './SoundEngine.ts'
import {narrationMeter} from './NarrationMeter.ts'

export const intro = {
  id: '__intro',
  title: 'Welcome to Slop Gallery',
  description: 'Where the art is questionable and the insurance is imaginary. Take a walk, touch the paintings and bring a little of your own chaos. The curator has already left.',
}

export class Narrator {
  private audio: HTMLAudioElement | undefined
  private disconnectAudio: (() => void) | undefined
  private cache = new Map<string, Blob>
  private controller = new AbortController
  private jobs = new Map<string, Promise<Blob>>
  private url: string | undefined
  private version = 0
  private waiting: string | undefined

  constructor(private settings: AiSettings, private key: string) {}

  dispose() {
    this.stop()
    this.controller.abort()
    this.cache.clear()
  }

  ready(id: string) {
    if (this.waiting === id) {
      void this.speak(id)
    } else if (this.settings.eager_audio) {
      void this.speak(id, false)
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
    if (!p || !s.sound) {
      return
    }
    if (play) {
      this.stop()
    }
    const version = this.version
    if (p.pending || p.merging) {
      if (play) {
        this.waiting = id
        useGallery.setState({
          narration: {
            id,
            status: 'preparing',
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
        },
      })
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
        if (!current()) return
        this.url = URL.createObjectURL(blob)
        const audio = this.audio = new Audio(this.url)
        audio.volume = 0.85
        this.disconnectAudio = narrationMeter.connect(audio, sound.context)
        audio.addEventListener('ended', () => {
          if (current()) {
            this.stop()
          }
        })
        audio.onerror = () => {
          if (current()) {
            this.stop()
            notify('Audio playback failed. The story is still available in the captions.')
          }
        }
        await audio.play()
        if (current()) {
          useGallery.setState({
            narration: {
              id,
              status: 'playing',
            },
          })
        }
      } else {
        this.browserSpeech(id, transcript, current)
      }
    } catch (error) {
      if (play && current()) {
        this.clearAudio()
        notify(error instanceof Error ? `${error.message} Using the browser voice instead.` : 'Using the browser voice instead.')
        this.browserSpeech(id, transcript, current)
      }
    }
  }

  stop() {
    this.version++
    this.waiting = undefined
    this.clearAudio()
    globalThis.speechSynthesis?.cancel()
    useGallery.setState({narration: null})
  }

  private clearAudio() {
    this.audio?.pause()
    this.disconnectAudio?.()
    this.disconnectAudio = undefined
    this.audio = undefined
    if (this.url) {
      URL.revokeObjectURL(this.url)
    }
    this.url = undefined
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

  private async generate(input: string) {
    await SoundEngine.get().resume()
    const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.key}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(90_000)]),
      body: JSON.stringify({
        model: this.settings.audio_model,
        voice: this.settings.narrator_voice,
        input,
        response_format: 'mp3',
        provider: {
          options: {
            openai: {instructions: this.settings.narrator_character},
            google: {instructions: this.settings.narrator_character},
          },
        },
      }),
    })
    if (!response.ok) {
      throw new Error(`Narration unavailable (${response.status}). Check the audio model in Settings.`)
    }
    const type = response.headers.get('content-type') ?? ''
    if (!/audio\/(mp3|mpeg|ogg|wav)/.test(type)) {
      throw new Error('The speech provider returned an unsupported audio format.')
    }
    const blob = await response.blob()
    if (!blob.size || blob.size > 25_000_000) {
      throw new Error('The speech provider returned invalid audio.')
    }
    return blob
  }
}

import type {AiSettings} from '../../src/lib/ai/settings.ts'

import {afterEach, beforeEach, expect, spyOn, test} from 'bun:test'

import {parameterParsers} from '../../src/lib/ai/settings.ts'
import {narrationMeter} from '../../src/lib/audio/NarrationMeter.ts'
import {Narrator} from '../../src/lib/audio/Narrator.ts'
import {SoundEngine} from '../../src/lib/audio/SoundEngine.ts'
import {initialPortraits} from '../../src/lib/gallery/collection.ts'
import {useGallery} from '../../src/lib/gallery/store.ts'

const settings = Object.fromEntries(Object.entries(parameterParsers).map(([key, parser]) => [key, parser.defaultValue])) as AiSettings
const spoken: Array<string> = []
const previous = {
  Audio: globalThis.Audio,
  speechSynthesis: globalThis.speechSynthesis,
  SpeechSynthesisUtterance: globalThis.SpeechSynthesisUtterance,
}
let disconnected = 0
let meterSpy: ReturnType<typeof spyOn<typeof narrationMeter, 'connect'>> | undefined
let narrator: Narrator
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>> | undefined
let soundSpy: ReturnType<typeof spyOn<typeof SoundEngine, 'get'>> | undefined
beforeEach(() => {
  spoken.length = 0
  disconnected = 0
  soundSpy = spyOn(SoundEngine, 'get').mockReturnValue({
    resume: async () => {},
    context: {},
  })
  meterSpy = spyOn(narrationMeter, 'connect').mockImplementation(() => () => {
    disconnected++
  })
  useGallery.setState({
    sound: true,
    narration: null,
    portraits: initialPortraits.map(p => ({
      ...p,
      narration: undefined,
    })),
  })
  Object.assign(globalThis, {
    Audio: class extends EventTarget {
      volume = 1; pause() {} async play() {}
    },
    SpeechSynthesisUtterance: class {
      constructor(public text: string) {}
    },
    speechSynthesis: {
      cancel() {},
      getVoices: () => [],
      speak: (utterance: {onstart: () => void
        text: string}) => {
        spoken.push(utterance.text)
        utterance.onstart()
      },
    },
  })
})
afterEach(() => {
  narrator?.dispose()
  fetchSpy?.mockRestore()
  soundSpy?.mockRestore()
  meterSpy?.mockRestore()
  Object.assign(globalThis, previous)
  useGallery.setState({sound: false})
})
test('a pending label queues only the most recently requested story', async () => {
  narrator = new Narrator({
    ...settings,
    ai: false,
  }, '')
  useGallery.getState().update('goose', {pending: true})
  useGallery.getState().update('orange', {pending: true})
  await narrator.speak('goose')
  await narrator.speak('orange')
  expect(useGallery.getState().narration).toMatchObject({
    status: 'preparing',
    source: null,
  })
  useGallery.getState().update('goose', {pending: false})
  narrator.ready('goose')
  expect(spoken).toHaveLength(0)
  useGallery.getState().update('orange', {
    pending: false,
    title: 'The final title',
  })
  narrator.ready('orange')
  expect(spoken).toHaveLength(1)
  expect(spoken[0]).toStartWith('The final title.')
  expect(useGallery.getState().narration).toEqual({
    id: 'orange',
    status: 'playing',
    source: 'browser',
  })
})
test('stop clears queued narration', async () => {
  narrator = new Narrator({
    ...settings,
    ai: false,
  }, '')
  useGallery.getState().update('goose', {pending: true})
  await narrator.speak('goose')
  narrator.stop()
  useGallery.getState().update('goose', {pending: false})
  narrator.ready('goose')
  expect(spoken).toHaveLength(0)
  expect(useGallery.getState().narration).toBeNull()
})
test('TTS keeps character steering out of the spoken transcript and caches audio', async () => {
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Blob(['audio'], {type: 'audio/mpeg'})))
  narrator = new Narrator(settings, 'test-key')
  await narrator.speak('goose')
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  const [url, request] = fetchSpy.mock.calls[0]
  expect(url).toBe('https://openrouter.ai/api/v1/audio/speech')
  const body = JSON.parse(request!.body as string) as {input: string
    provider: {options: {google: {instructions: string}}}
    response_format: string}
  expect(body.input).not.toContain(settings.narrator_character)
  expect(body.provider.options.google.instructions).toBe(settings.narrator_character)
  expect(body.response_format).toBe('pcm')
  expect(useGallery.getState().narration).toMatchObject({
    status: 'playing',
    source: 'audio',
  })
  expect(meterSpy).toHaveBeenCalledTimes(1)
  await narrator.speak('goose')
  expect(fetchSpy).toHaveBeenCalledTimes(1)
})
test('provider failure falls back to readable browser narration', async () => {
  soundSpy = spyOn(SoundEngine, 'get').mockReturnValue({resume: async () => {}})
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Unavailable', {status: 503}))
  narrator = new Narrator(settings, 'test-key')
  await narrator.speak('goose')
  expect(spoken).toHaveLength(1)
  expect(useGallery.getState().narration).toMatchObject({
    status: 'playing',
    source: 'browser',
  })
})
test('bundled recordings play without a key or a speech provider request', async () => {
  useGallery.setState({portraits: initialPortraits.map(p => ({...p}))})
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Blob(['audio'], {type: 'audio/ogg'})))
  narrator = new Narrator({
    ...settings,
    ai: false,
  }, '')
  await narrator.speak('goose')
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(fetchSpy.mock.calls[0][0]).toBe('/audio/goose.opus')
  expect(spoken).toHaveLength(0)
  expect(useGallery.getState().narration).toEqual({
    id: 'goose',
    status: 'playing',
    source: 'audio',
  })
  expect(meterSpy).toHaveBeenCalledTimes(1)
  narrator.stop()
  expect(disconnected).toBe(1)
  expect(useGallery.getState().narration).toBeNull()
})
test('stopping while the audio context resumes cannot start stale playback or metering', async () => {
  let resume!: () => void
  const resumed = new Promise<void>(resolve => {
    resume = resolve
  })
  let started!: () => void
  const resuming = new Promise<void>(resolve => {
    started = resolve
  })
  soundSpy!.mockReturnValue({
    resume: () => {
      started(); return resumed
    },
    context: {},
  })
  useGallery.setState({portraits: initialPortraits.map(p => ({...p}))})
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Blob(['audio'], {type: 'audio/ogg'})))
  narrator = new Narrator({
    ...settings,
    ai: false,
  }, '')
  const job = narrator.speak('goose')
  await resuming
  narrator.stop()
  resume()
  await job
  expect(meterSpy).not.toHaveBeenCalled()
  expect(useGallery.getState().narration).toBeNull()
})
test('playback failure disconnects the spectrum before browser speech takes over', async () => {
  Object.assign(globalThis, {
    Audio: class extends EventTarget {
      volume = 1
      pause() {}
      async play() {
        throw new Error('Playback rejected')
      }
    },
  })
  useGallery.setState({portraits: initialPortraits.map(p => ({...p}))})
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Blob(['audio'], {type: 'audio/ogg'})))
  narrator = new Narrator({
    ...settings,
    ai: false,
  }, '')
  await narrator.speak('goose')
  expect(disconnected).toBe(1)
  expect(spoken).toHaveLength(1)
  expect(useGallery.getState().narration).toMatchObject({
    status: 'playing',
    source: 'browser',
  })
})
test('a manual edit releases queued narration without waiting for the old generator', async () => {
  narrator = new Narrator({
    ...settings,
    ai: false,
  }, '')
  useGallery.getState().update('goose', {pending: true})
  await narrator.speak('goose')
  const s = useGallery.getState()
  s.commit(s.portraits.map(p => (p.id === 'goose' ? {...p, title: 'My label', description: 'My story', pending: false} : p)))
  expect(spoken).toEqual(['My label. My story.'])
  expect(useGallery.getState().narration).toMatchObject({
    status: 'playing',
    source: 'browser',
  })
  narrator.ready('goose')
  expect(spoken).toHaveLength(1)
})
for (const reject of [true, false]) {
  test(`an audio error ${reject ? 'with play rejection' : 'after playback starts'} falls back exactly once`, async () => {
    let audio: {onerror: (() => void) | null} | undefined
    Object.assign(globalThis, {
      Audio: class extends EventTarget {
        onerror: (() => void) | null = null
        volume = 1
        constructor() {
          super(); audio = this
        }
        pause() {}
        async play() {
          if (reject) {
            this.onerror?.()
            throw new Error('Playback rejected')
          }
        }
      },
    })
    useGallery.setState({portraits: initialPortraits.map(p => ({...p}))})
    fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Blob(['audio'], {type: 'audio/ogg'})))
    narrator = new Narrator({
      ...settings,
      ai: false,
    }, '')
    await narrator.speak('goose')
    if (!reject) {
      audio?.onerror?.()
    }
    expect(disconnected).toBe(1)
    expect(spoken).toHaveLength(1)
    expect(useGallery.getState().narration).toMatchObject({
      status: 'playing',
      source: 'browser',
    })
  })
}
test('a deliberate stop invalidates a late audio failure without fallback', async () => {
  let fail: (() => void) | undefined
  const playing = Promise.withResolvers<void>()
  const started = Promise.withResolvers<void>()
  Object.assign(globalThis, {
    Audio: class extends EventTarget {
      onerror: (() => void) | null = null
      volume = 1
      pause() {}
      play() {
        fail = this.onerror ?? undefined; started.resolve(); return playing.promise
      }
    },
  })
  useGallery.setState({portraits: initialPortraits.map(p => ({...p}))})
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Blob(['audio'], {type: 'audio/ogg'})))
  narrator = new Narrator({
    ...settings,
    ai: false,
  }, '')
  const job = narrator.speak('goose')
  await started.promise
  narrator.stop()
  fail?.()
  playing.reject(new Error('Stopped'))
  await job
  expect(spoken).toHaveLength(0)
  expect(useGallery.getState().narration).toBeNull()
})
test('replacing a story under the same ID stops playback and blocks late provider audio', async () => {
  const fetched = Promise.withResolvers<Response>()
  fetchSpy = spyOn(globalThis, 'fetch').mockReturnValue(fetched.promise)
  narrator = new Narrator(settings, 'test-key')
  const job = narrator.speak('goose')
  useGallery.getState().update('goose', {description: 'A replacement story.'})
  fetched.resolve(new Response(new Blob(['audio'], {type: 'audio/mpeg'})))
  await job
  expect(meterSpy).not.toHaveBeenCalled()
  expect(spoken).toHaveLength(0)
  expect(useGallery.getState().narration).toBeNull()
})
test('editing an already spoken story cancels the actual browser utterance', async () => {
  narrator = new Narrator({
    ...settings,
    ai: false,
  }, '')
  await narrator.speak('goose')
  const cancel = spyOn(speechSynthesis, 'cancel')
  try {
    useGallery.getState().update('goose', {description: 'A different story.'})
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(spoken).toHaveLength(1)
    expect(useGallery.getState().narration).toBeNull()
  } finally {
    cancel.mockRestore()
  }
})

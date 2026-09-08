import type {AiSettings} from '../../src/lib/ai/settings.ts'

import {afterEach, beforeEach, expect, spyOn, test} from 'bun:test'

import {parameterParsers} from '../../src/lib/ai/settings.ts'
import {Narrator} from '../../src/lib/audio/Narrator.ts'
import {narrationMeter} from '../../src/lib/audio/NarrationMeter.ts'
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
  soundSpy = spyOn(SoundEngine, 'get').mockReturnValue({resume: async () => {}, context: {}} as SoundEngine)
  meterSpy = spyOn(narrationMeter, 'connect').mockImplementation(() => () => {disconnected++})
  useGallery.setState({
    sound: true,
    narration: null,
    portraits: initialPortraits.map(p => ({...p, narration: undefined})),
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
  expect(useGallery.getState().narration).toMatchObject({status: 'preparing', source: null})
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
  const [url, request] = fetchSpy.mock.calls[0]!
  expect(url).toBe('https://openrouter.ai/api/v1/audio/speech')
  const body = JSON.parse(request!.body as string)
  expect(body.input).not.toContain(settings.narrator_character)
  expect(body.provider.options.google.instructions).toBe(settings.narrator_character)
  expect(body.response_format).toBe('mp3')
  expect(useGallery.getState().narration).toMatchObject({status: 'playing', source: 'audio'})
  expect(meterSpy).toHaveBeenCalledTimes(1)
  await narrator.speak('goose')
  expect(fetchSpy).toHaveBeenCalledTimes(1)
})
test('provider failure falls back to readable browser narration', async () => {
  soundSpy = spyOn(SoundEngine, 'get').mockReturnValue({resume: async () => {}} as SoundEngine)
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Unavailable', {status: 503}))
  narrator = new Narrator(settings, 'test-key')
  await narrator.speak('goose')
  expect(spoken).toHaveLength(1)
  expect(useGallery.getState().narration).toMatchObject({status: 'playing', source: 'browser'})
})

test('bundled recordings play without a key or a speech provider request', async () => {
  useGallery.setState({portraits: initialPortraits.map(p => ({...p}))})
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Blob(['audio'], {type: 'audio/ogg'})))
  narrator = new Narrator({...settings, ai: false}, '')
  await narrator.speak('goose')
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(fetchSpy.mock.calls[0]![0]).toBe('/audio/goose.opus')
  expect(spoken).toHaveLength(0)
  expect(useGallery.getState().narration).toEqual({id: 'goose', status: 'playing', source: 'audio'})
  expect(meterSpy).toHaveBeenCalledTimes(1)
  narrator.stop()
  expect(disconnected).toBe(1)
  expect(useGallery.getState().narration).toBeNull()
})

test('stopping while the audio context resumes cannot start stale playback or metering', async () => {
  let resume!: () => void
  const resumed = new Promise<void>(resolve => {resume = resolve})
  let started!: () => void
  const resuming = new Promise<void>(resolve => {started = resolve})
  soundSpy!.mockReturnValue({resume: () => {started(); return resumed}, context: {}} as SoundEngine)
  useGallery.setState({portraits: initialPortraits.map(p => ({...p}))})
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Blob(['audio'], {type: 'audio/ogg'})))
  narrator = new Narrator({...settings, ai: false}, '')
  const job = narrator.speak('goose')
  await resuming
  narrator.stop()
  resume()
  await job
  expect(meterSpy).not.toHaveBeenCalled()
  expect(useGallery.getState().narration).toBeNull()
})

test('playback failure disconnects the spectrum before browser speech takes over', async () => {
  Object.assign(globalThis, {Audio: class extends EventTarget {
    volume = 1
    pause() {}
    async play() {throw new Error('Playback rejected')}
  }})
  useGallery.setState({portraits: initialPortraits.map(p => ({...p}))})
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Blob(['audio'], {type: 'audio/ogg'})))
  narrator = new Narrator({...settings, ai: false}, '')
  await narrator.speak('goose')
  expect(disconnected).toBe(1)
  expect(spoken).toHaveLength(1)
  expect(useGallery.getState().narration).toMatchObject({status: 'playing', source: 'browser'})
})

import {afterEach, beforeEach, expect, test} from 'bun:test'

import {flush} from '../packages/use-audio-queue/test/helpers.ts'
import {browserSpeech} from '../src/browser.ts'
import {Narrator} from '../src/core.ts'

class Utterance {
  lang = ''
  onboundary: ((event: {charIndex: number}) => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: {error: string}) => void) | null = null
  onstart: (() => void) | null = null
  pitch = 1
  rate = 1
  voice = null
  constructor(readonly text: string) {}
}
const original = {
  speechSynthesis: globalThis.speechSynthesis,
  SpeechSynthesisUtterance: globalThis.SpeechSynthesisUtterance,
}
let narrator: Narrator
let utterances: Array<Utterance>
let synthesis: {
  cancel: () => void
  cancellations: number
  getVoices: () => []
  paused: boolean
  pending: boolean
  speak: (utterance: Utterance) => void
  speaking: boolean
}
beforeEach(() => {
  utterances = []
  synthesis = {
    speaking: false,
    pending: false,
    paused: false,
    cancellations: 0,
    getVoices: () => [],
    cancel() {
      this.cancellations++; this.speaking = false
    },
    speak(utterance) {
      this.speaking = true; utterances.push(utterance); utterance.onstart?.()
    },
  }
  Object.assign(globalThis, {
    speechSynthesis: synthesis,
    SpeechSynthesisUtterance: Utterance,
  })
  narrator = new Narrator
})
afterEach(() => {
  narrator.dispose(); Object.assign(globalThis, original)
})
const end = () => {
  synthesis.speaking = false; utterances.at(-1)!.onend?.()
}
test('native speech obeys the same serialized queue and exposes browser metadata', async () => {
  narrator.push({
    text: 'First',
    rate: 0.91,
    lang: 'en-GB',
  })
  narrator.push('Second')
  await flush()
  expect(utterances.map(u => u.text)).toEqual(['First'])
  expect(utterances[0].rate).toBe(0.91)
  expect(narrator.getSnapshot().current?.metadata.source).toBe('browser')
  end()
  await flush()
  expect(utterances.map(u => u.text)).toEqual(['First', 'Second'])
})
test('injected native speech resumes at the last reported boundary and ignores stale callbacks', async () => {
  const original = narrator.push('Alpha beta gamma')
  await flush()
  const staleEnd = utterances[0].onend!
  utterances[0].onboundary?.({charIndex: 6})
  const inserted = narrator.push('Inserted', {priority: 'inject'})
  await flush()
  expect(synthesis.cancellations).toBe(1)
  expect(utterances.map(u => u.text)).toEqual(['Alpha beta gamma', 'Inserted'])
  staleEnd()
  expect(narrator.getSnapshot().current?.id).toBe(inserted.id)
  end()
  await flush()
  expect(narrator.getSnapshot().current?.id).toBe(original.id)
  expect(utterances.at(-1)!.text).toBe('beta gamma')
  expect(synthesis.cancellations).toBe(1)
})
test('overlapping native speech fails explicitly without cancelling the active utterance', async () => {
  const first = narrator.push('First')
  await flush()
  const simultaneous = narrator.push('Concurrent', {priority: 'async'})
  await flush()
  const result = await simultaneous.finished
  expect(result.status).toBe('failed')
  if (result.status === 'failed') {
    expect(String(result.error)).toContain('cannot overlap')
  }
  expect(narrator.getSnapshot().current?.id).toBe(first.id)
  expect(synthesis.cancellations).toBe(0)
  expect(utterances).toHaveLength(1)
})
test('an unrelated native utterance is not cancelled when our attempt is rejected', async () => {
  synthesis.speaking = true
  const rejected = narrator.push('Cannot acquire native speech')
  expect((await rejected.finished).status).toBe('failed')
  expect(synthesis.cancellations).toBe(0)
  expect(synthesis.speaking).toBe(true)
})
test('stop cancels the owned native utterance once and never starts pending speech', async () => {
  const first = narrator.push('First')
  const second = narrator.push('Second')
  await flush()
  narrator.stop()
  await flush()
  expect((await first.finished).status).toBe('cancelled')
  expect((await second.finished).status).toBe('cancelled')
  expect(synthesis.cancellations).toBe(1)
  expect(utterances).toHaveLength(1)
})
test('native failure settles and allows the next queued utterance to start', async () => {
  const broken = narrator.push('Broken')
  const next = narrator.push('Next')
  await flush()
  synthesis.speaking = false
  utterances[0].onerror?.({error: 'synthesis-failed'})
  await flush()
  expect((await broken.finished).status).toBe('failed')
  expect(narrator.getSnapshot().current?.id).toBe(next.id)
})
test('missing browser speech reports a capability error rather than hanging', () => {
  Object.assign(globalThis, {speechSynthesis: undefined})
  expect(() => browserSpeech({text: 'Hello'}, (new AbortController).signal)).toThrow('unavailable')
})

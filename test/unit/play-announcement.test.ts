import {afterEach, expect, mock, spyOn, test} from 'bun:test'

import {narrationMeter} from '../../src/lib/audio/NarrationMeter.ts'
import {playAnnouncement} from '../../src/lib/audio/playAnnouncement.ts'
import {SoundEngine} from '../../src/lib/audio/SoundEngine.ts'

const originalAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio')
const spies: Array<{mockRestore: () => void}> = []
afterEach(() => {
  for (const spy of spies.splice(0)) {
    spy.mockRestore()
  }
  if (originalAudio) {
    Object.defineProperty(globalThis, 'Audio', originalAudio)
  } else {
    Reflect.deleteProperty(globalThis, 'Audio')
  }
})
function setup() {
  const ready = Promise.withResolvers<void>()
  const audio = Object.assign(new EventTarget, {
    play: mock(() => ready.promise),
    pause: mock(() => {}),
    load: mock(() => {}),
    removeAttribute: mock((_name: string) => {}),
    volume: 0,
  })
  Object.defineProperty(globalThis, 'Audio', {
    configurable: true,
    value() {
      return audio
    },
  })
  const disconnect = mock(() => {})
  spies.push(spyOn(SoundEngine, 'get').mockReturnValue({
    resume: async () => {},
    context: {},
  } as SoundEngine))
  spies.push(spyOn(narrationMeter, 'connect').mockReturnValue(disconnect))
  return {
    audio,
    ready,
    disconnect,
  }
}
test('local announcement waits for ended and disconnects its audio graph', async () => {
  const {audio, ready, disconnect} = setup()
  const playing = mock(() => {})
  const controller = new AbortController
  const result = playAnnouncement('/announce.opus', controller.signal, playing)
  await Promise.resolve()
  ready.resolve()
  await Promise.resolve()
  expect(playing).toHaveBeenCalledTimes(1)
  expect(disconnect).not.toHaveBeenCalled()
  audio.dispatchEvent(new Event('ended'))
  await result
  expect(audio.pause).toHaveBeenCalledTimes(1)
  expect(disconnect).toHaveBeenCalledTimes(1)
  expect(audio.removeAttribute).toHaveBeenCalledWith('src')
  expect(audio.load).toHaveBeenCalledTimes(1)
})
test('aborting while play is pending cannot publish stale playing state', async () => {
  const {audio, ready, disconnect} = setup()
  const playing = mock(() => {})
  const controller = new AbortController
  const result = playAnnouncement('/announce.opus', controller.signal, playing)
  const rejection = result.catch(error => error)
  await Promise.resolve()
  controller.abort(new Error('Canceled'))
  expect(await rejection).toBeInstanceOf(Error)
  ready.resolve()
  await Promise.resolve()
  audio.dispatchEvent(new Event('ended'))
  expect(playing).not.toHaveBeenCalled()
  expect(disconnect).toHaveBeenCalledTimes(1)
})
test('media errors clean up and suppress a late play completion', async () => {
  const {audio, ready, disconnect} = setup()
  const playing = mock(() => {})
  const result = playAnnouncement('/announce.opus', (new AbortController).signal, playing)
  const rejection = result.catch(error => error)
  await Promise.resolve()
  audio.dispatchEvent(new Event('error'))
  await rejection
  ready.resolve()
  await Promise.resolve()
  expect(playing).not.toHaveBeenCalled()
  expect(disconnect).toHaveBeenCalledTimes(1)
})

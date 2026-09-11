import {afterEach, expect, mock, test} from 'bun:test'

import {SoundEngine} from '../../src/lib/audio/SoundEngine.ts'

const originalContext = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
afterEach(() => {
  if (originalContext) {
    Object.defineProperty(globalThis, 'AudioContext', originalContext)
  } else {
    Reflect.deleteProperty(globalThis, 'AudioContext')
  }
})
const createGain = () => ({
  gain: {
    value: 1,
    setTargetAtTime: mock((_value: number, _time: number, _constant: number) => {}),
    setValueAtTime: mock((_value: number, _time: number) => {}),
    exponentialRampToValueAtTime: mock((_value: number, _time: number) => {}),
  },
  connect: mock((node: unknown) => node),
  disconnect: mock(() => {}),
})
function setup() {
  const gains: Array<ReturnType<typeof createGain>> = []
  const context = {
    currentTime: 1,
    destination: {},
    createGain: () => {
      const gain = createGain()
      gains.push(gain)
      return gain
    },
    createOscillator: () => Object.assign(new EventTarget, {
      frequency: {
        setValueAtTime: mock((_value: number, _time: number) => {}),
        exponentialRampToValueAtTime: mock((_value: number, _time: number) => {}),
      },
      connect: mock((node: unknown) => node),
      disconnect: mock(() => {}),
      start: mock((_time: number) => {}),
      stop: mock((_time: number) => {}),
    }),
  }
  Object.defineProperty(globalThis, 'AudioContext', {
    configurable: true,
    value: class {
      constructor() {
        return context
      }
    },
  })
  // Construct an isolated engine without populating the application singleton.
  const sound = Reflect.construct(SoundEngine, []) as SoundEngine
  return {
    sound,
    context,
    gains,
  }
}
test('effects start 12 dB louder and restore the same gain after muting', () => {
  const {sound, context, gains} = setup()
  const master = gains[0]
  expect(20 * Math.log10(master.gain.value / 0.6)).toBeCloseTo(12)
  expect(master.connect).toHaveBeenCalledWith(context.destination)
  sound.mute(true)
  expect(master.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 1, 0.08)
  context.currentTime = 2
  sound.mute(false)
  expect(master.gain.setTargetAtTime).toHaveBeenLastCalledWith(master.gain.value, 2, 0.08)
})
test('footsteps and interaction tones share the boost without changing their envelopes', () => {
  const {sound, context, gains} = setup()
  sound.step(true)
  context.currentTime = 2
  sound.step(false)
  sound.tone(320)
  expect(gains).toHaveLength(4)
  for (const [index, volume, time, duration] of [[1, 0.018, 1, 0.07], [2, 0.018, 2, 0.07], [3, 0.055, 2, 0.3]]) {
    const envelope = gains[index]
    expect(envelope.connect).toHaveBeenCalledWith(sound.master)
    expect(envelope.gain.setValueAtTime).toHaveBeenCalledWith(volume, time)
    expect(envelope.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, time + duration)
  }
})

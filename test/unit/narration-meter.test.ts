import {expect, test} from 'bun:test'

import NarrationMeter, {frequencyLevels} from '../../src/lib/audio/NarrationMeter.ts'

test('frequency bands measure silence, full scale and isolated speech frequencies', () => {
  const frequencies = new Uint8Array(1024)
  expect([...frequencyLevels(frequencies, 48_000, 2048)]).toEqual([0, 0, 0, 0, 0])
  frequencies.fill(255)
  expect([...frequencyLevels(frequencies, 48_000, 2048)]).toEqual([1, 1, 1, 1, 1])
  frequencies.fill(0)
  for (let bin = Math.ceil(500 / (48_000 / 2048)); bin < Math.ceil(2000 / (48_000 / 2048)); bin++) {
    frequencies[bin] = 255
  }
  expect([...frequencyLevels(frequencies, 48_000, 2048)]).toEqual([0, 0, 1, 0, 0])
  expect([...frequencyLevels(new Uint8Array(1024).fill(255), 8000, 2048)]).toEqual([1, 1, 1, 1, 0])
})
test('meter routes narration once, clears silence and protects newer connections', () => {
  const routes: Array<unknown> = []
  let disconnected = 0
  const context = {
    state: 'running',
    sampleRate: 48_000,
    destination: {},
    createMediaElementSource: () => ({
      connect: (node: unknown) => routes.push(node),
      disconnect: () => {
        disconnected++
      },
    }),
    createAnalyser: () => ({
      context,
      fftSize: 0,
      connect: (node: unknown) => routes.push(node),
      disconnect: () => {
        disconnected++
      },
      getByteFrequencyData: (target: Uint8Array) => target.fill(128),
    }),
  }
  const meter = new NarrationMeter
  const audio = {
    paused: false,
    ended: false,
    muted: false,
    volume: 0.85,
  }
  const connect = () => meter.connect(audio as HTMLAudioElement, context as unknown as AudioContext)
  expect([...meter.read()]).toEqual([0, 0, 0, 0, 0])
  const old = connect()
  expect(routes).toHaveLength(2)
  expect(routes[1]).toBe(context.destination)
  expect(routes[0]).toMatchObject({
    fftSize: 2048,
    smoothingTimeConstant: 0.72,
    minDecibels: -90,
    maxDecibels: -10,
  })
  expect(meter.read()[2]).toBeCloseTo(128 / 255)
  for (const property of ['paused', 'ended', 'muted'] as const) {
    audio[property] = true
    expect([...meter.read()]).toEqual([0, 0, 0, 0, 0])
    audio[property] = false
  }
  audio.volume = 0
  expect([...meter.read()]).toEqual([0, 0, 0, 0, 0])
  audio.volume = 0.85
  context.state = 'suspended'
  expect([...meter.read()]).toEqual([0, 0, 0, 0, 0])
  context.state = 'running'
  const latest = connect()
  old()
  expect(meter.read()[2]).toBeCloseTo(128 / 255)
  latest()
  expect([...meter.read()]).toEqual([0, 0, 0, 0, 0])
  expect(disconnected).toBe(4)
})

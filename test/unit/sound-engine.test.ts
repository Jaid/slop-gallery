import {afterEach, expect, test} from 'bun:test'

import SoundEngine from '../../src/lib/audio/SoundEngine.ts'
import audioFixture from './audioFixture.ts'

const originalContext = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
afterEach(() => {
  if (originalContext) {
    Object.defineProperty(globalThis, 'AudioContext', originalContext)
  } else {
    Reflect.deleteProperty(globalThis, 'AudioContext')
  }
})
function setup() {
  const fixture = audioFixture()
  Object.defineProperty(globalThis, 'AudioContext', {
    configurable: true,
    value: class {
      constructor() {
        return fixture.context
      }
    },
  })
  return {
    ...fixture,
    sound: Reflect.construct(SoundEngine, []) as SoundEngine,
  }
}
test('effects retain their 12 dB boost and mute only schedules changes', () => {
  const {sound, context, gains} = setup()
  const master = gains[0]
  expect(20 * Math.log10(master.gain.value / 0.6)).toBeCloseTo(12)
  expect(master.connect).toHaveBeenCalledWith(context.destination)
  sound.mute(true)
  sound.mute(true)
  expect(master.gain.setTargetAtTime).toHaveBeenCalledTimes(1)
  expect(master.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.08)
  context.currentTime = 2
  sound.mute(false)
  expect(master.gain.setTargetAtTime).toHaveBeenLastCalledWith(master.gain.value, 2, 0.08)
})
test('stride callbacks at time zero and closer than the old cooldown all produce footsteps', () => {
  const {sound, context, sources, buffers} = setup()
  for (const time of [0, 0.18, 0.36]) {
    context.currentTime = time
    sound.step('hollow', 9, false)
  }
  expect(sources).toHaveLength(9)
  expect(buffers[0]).not.toEqual(buffers[2])
  sound.step('generic', 0, false)
  expect(sources).toHaveLength(9)
})
test('landing reuses the Soft Weight timbre and increases strength with fall speed', () => {
  const light = setup()
  light.sound.land('generic', 5, false, 2)
  const heavy = setup()
  heavy.sound.land('generic', 5, false, 9)
  expect(light.sources[0].frequency.setValueAtTime.mock.calls[0][0]).toBe(heavy.sources[0].frequency.setValueAtTime.mock.calls[0][0])
  const lightPeak = Math.max(...light.gains.slice(2).map(gain => gain.gain.linearRampToValueAtTime.mock.calls[0]?.[0] ?? 0))
  const heavyPeak = Math.max(...heavy.gains.slice(2).map(gain => gain.gain.linearRampToValueAtTime.mock.calls[0]?.[0] ?? 0))
  expect(heavyPeak).toBeGreaterThan(lightPeak)
})
test('landing prevents a duplicate footfall at impact, not subsequent strides', () => {
  const {sound, context, sources} = setup()
  sound.land('generic', 3, false, 5)
  sound.step('generic', 3, false)
  context.currentTime = 0.05
  sound.step('generic', 3, false)
  expect(sources).toHaveLength(3)
  context.currentTime = 0.11
  sound.step('generic', 3, false)
  expect(sources).toHaveLength(6)
})
test('zoom sweeps use the transition duration and reversals fade the previous sound', () => {
  const {sound, context, sources, gains} = setup()
  sound.zoomTransition(false, false, 0.4)
  expect(sources).toHaveLength(2)
  expect(sources[0].stop).toHaveBeenLastCalledWith(0.4)
  expect(sources[0].frequency.setValueAtTime).toHaveBeenCalledWith(190, 0)
  context.currentTime = 0.1
  sound.zoomTransition(true, true, 0.3)
  expect(sources[0].stop).toHaveBeenLastCalledWith(0.125)
  expect(gains[1].gain.cancelAndHoldAtTime).toHaveBeenCalledWith(0.1)
  expect(sources[2].frequency.setValueAtTime).toHaveBeenCalledWith(1260, 0.1)
  expect(sources[2].stop).toHaveBeenLastCalledWith(0.4)
  sound.zoomTransition(false, false, 0)
  expect(sources).toHaveLength(4)
})
test('held zoom has one quiet bed, follows zoom amount, and stops on release', () => {
  const {sound, context, sources, gains} = setup()
  for (let i = 1; i <= 100; i++) {
    sound.setZoom(i / 100)
  }
  expect(sources).toHaveLength(2)
  expect(sources[0].stop).not.toHaveBeenCalled()
  expect(gains[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.025)
  sound.zoomTransition(true, false, 0)
  expect(gains[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(1.35, 0, 0.025)
  context.currentTime = 1
  sound.setZoom(0)
  expect(sources[0].stop).toHaveBeenLastCalledWith(1.06)
  sound.setZoom(0)
  expect(sources[0].stop).toHaveBeenCalledTimes(1)
})
test('muting and cleanup stop sustained and transitioning sounds without queuing muted actions', () => {
  const {sound, sources} = setup()
  sound.setZoom(1)
  sound.zoomTransition(true, false, 0.2)
  sound.viewTransition(true)
  const count = sources.length
  sound.mute(true)
  for (const source of sources) {
    expect(source.stop).toHaveBeenCalled()
  }
  sound.setZoom(1)
  sound.zoomTransition(false, false, 0.2)
  sound.viewTransition(false)
  sound.step('generic', 9, false)
  sound.land('generic', 3, false, 8)
  sound.tone(320)
  expect(sources).toHaveLength(count)
  sound.mute(false)
  expect(sources).toHaveLength(count)
  sound.setZoom(1)
  expect(sources).toHaveLength(count + 2)
  sound.stopPlayerSounds()
  sound.stopPlayerSounds()
  expect(sources.at(-1)!.stop).toHaveBeenCalledTimes(1)
})
test('viewing mode reversal cancels its delayed voices and completed nodes disconnect', () => {
  const {sound, sources, gains, filters} = setup()
  sound.viewTransition(true)
  const entering = [...sources]
  sound.viewTransition(false)
  expect(entering[2].stop).toHaveBeenLastCalledWith(0.025)
  for (const source of sources) {
    source.dispatchEvent(new Event('ended'))
    expect(source.disconnect).toHaveBeenCalledTimes(1)
  }
  for (const node of [...gains.slice(1), ...filters]) {
    expect(node.disconnect).toHaveBeenCalledTimes(1)
  }
  expect(gains[0].disconnect).not.toHaveBeenCalled()
})
test('delayed footstep layers are intrinsically silent before their scheduled attack', () => {
  const {sound, gains} = setup()
  sound.step('generic', 9, false)
  for (const envelope of gains.slice(2)) {
    expect(envelope.gain.value).toBe(0)
  }
})

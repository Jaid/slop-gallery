import type {RoomAcoustics} from '../../src/lib/audio/acoustics/Acoustics.ts'
import type {Reverberation} from '../../src/lib/audio/acoustics/reverberation.ts'

import {afterEach, expect, mock, spyOn, test} from 'bun:test'

import Acoustics from '../../src/lib/audio/acoustics/Acoustics.ts'
import {reverberationImpulse} from '../../src/lib/audio/acoustics/reverberation.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'
import knottingham from '../../src/worlds/knottingham/index.ts'
import sandbox from '../../src/worlds/sandbox/index.ts'
import audioFixture from './audioFixture.ts'

let timers: ReturnType<typeof spyOn<typeof globalThis, 'setTimeout'>> | undefined
afterEach(() => {
  timers?.mockRestore()
  timers = undefined
})
/** Acoustics on the fixture’s context, with the timers that release rooms left behind caught instead of run. */
function setup() {
  const fixture = audioFixture()
  const scheduled: Array<() => void> = []
  timers = spyOn(globalThis, 'setTimeout').mockImplementation(((job: () => void) => {
    scheduled.push(job)
    return scheduled.length
  }) as typeof setTimeout)
  const [input, output] = [fixture.context.createGain(), fixture.context.createGain()]
  const context = fixture.context as unknown as BaseAudioContext
  const acoustics = new Acoustics(context, input as unknown as AudioNode, output as unknown as AudioNode)
  return {
    ...fixture,
    acoustics,
    input,
    output,
    scheduled,
  }
}
const room = () => {
  const release = mock(() => {})
  const acoustics = mock(((_context, input, output) => {
    input.connect(output)
    return release
  }) satisfies RoomAcoustics)
  return {
    acoustics,
    release,
  }
}
test('the world sounds dry until the listener enters a room, which then fades in its own acoustics', () => {
  const {acoustics, context, gains, input, output} = setup()
  const outside = gains[2]
  expect(input.connect).toHaveBeenCalledWith(outside)
  expect(outside.connect).toHaveBeenCalledWith(output)
  expect(outside.gain.value).toBe(1)
  context.currentTime = 2
  const lobby = room()
  acoustics.enter('lobby', lobby.acoustics)
  const send = gains[3]
  expect(lobby.acoustics).toHaveBeenCalledWith(context, send, output)
  expect(input.connect).toHaveBeenLastCalledWith(send)
  expect(send.gain.value).toBe(0)
  expect(send.gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 2, 0.12)
  expect(outside.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 2, 0.12)
  acoustics.enter('lobby', lobby.acoustics)
  expect(lobby.acoustics).toHaveBeenCalledTimes(1)
  expect(gains).toHaveLength(4)
})
test('a room left behind rings out and is released later, unless the listener steps back in before', () => {
  const {acoustics, gains, input, scheduled} = setup()
  const lobby = room()
  const vesper = room()
  acoustics.enter('lobby', lobby.acoustics)
  acoustics.enter('vesper', vesper.acoustics)
  const [, , outside, lobbySend, vesperSend] = gains
  expect(lobbySend.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.12)
  expect(lobby.release).not.toHaveBeenCalled()
  // Back through the doorway, the Lobby’s acoustics are still there.
  acoustics.enter('lobby', lobby.acoustics)
  expect(lobby.acoustics).toHaveBeenCalledTimes(1)
  expect(lobbySend.gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.12)
  expect(vesperSend.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.12)
  // The timers: leaving the outside, the Lobby (cleared by stepping back in) and the Vesper.
  expect(scheduled).toHaveLength(3)
  scheduled[0]()
  expect(input.disconnect).toHaveBeenLastCalledWith(outside)
  scheduled[2]()
  expect(vesper.release).toHaveBeenCalledTimes(1)
  expect(input.disconnect).toHaveBeenLastCalledWith(vesperSend)
  expect(lobby.release).not.toHaveBeenCalled()
  // Entering the Vesper anew builds its acoustics anew.
  acoustics.enter('vesper', vesper.acoustics)
  expect(vesper.acoustics).toHaveBeenCalledTimes(2)
})
test('rooms without acoustics of their own sound dry', () => {
  const {acoustics, gains, output} = setup()
  acoustics.enter('corridor', undefined)
  expect(gains[3].connect).toHaveBeenCalledWith(output)
})
/** a context that only makes buffers, a channel of its own each */
const bufferContext = () => ({
  sampleRate: 48_000,
  createBuffer(channels: number, length: number) {
    const data = Array.from({length: channels}, () => new Float32Array(length))
    return {
      length,
      numberOfChannels: channels,
      getChannelData: (channel: number) => data[channel],
    }
  },
}) as unknown as BaseAudioContext
const hall: Reverberation = {
  decay: 2,
  predelay: 0.02,
  brightness: [8000, 2000],
  early: [[0.01, 0.4]],
  flutter: [0.02, 3, 0.3],
  wet: 0.2,
}
test('a reverberation’s impulse rings for its decay after its predelay at unit energy, the same every time, made once per context', () => {
  const context = bufferContext()
  const impulse = reverberationImpulse(context, hall)
  expect(reverberationImpulse(context, hall)).toBe(impulse)
  expect(impulse.length).toBe(Math.ceil((0.02 + 2 * 1.1) * 48_000))
  const [left, right] = [impulse.getChannelData(0), impulse.getChannelData(1)]
  expect(left.subarray(0, 0.02 * 48_000).every(sample => sample === 0)).toBe(true)
  let energy = 0
  for (const data of [left, right]) {
    for (const sample of data) {
      expect(Number.isFinite(sample)).toBe(true)
      energy += sample * sample
    }
  }
  expect(energy / 2).toBeCloseTo(1, 4)
  // The two channels differ, which widens the room.
  expect(left).not.toEqual(right)
  // The tail has died by 60 dB at the decay time.
  const level = (data: Float32Array, from: number) => Math.max(...data.subarray(from * 48_000, (from + 0.1) * 48_000).map(Math.abs))
  expect(level(left, 2.02) / level(left, 0.1)).toBeLessThan(0.002)
  const again = reverberationImpulse(bufferContext(), hall)
  expect(again).not.toBe(impulse)
  expect(again.getChannelData(0)).toEqual(left)
})
test('every room of every world has acoustics of its own', () => {
  for (const world of [slopGallery, knottingham, sandbox]) {
    for (const placed of world.rooms) {
      expect(`${placed.id}: ${typeof placed.acoustics}`).toBe(`${placed.id}: function`)
    }
  }
})

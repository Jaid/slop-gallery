import type {RoomAcoustics} from './Acoustics.ts'

/** how a room answers a sound by what it is built of, which {@link reverberation} generates a stereo impulse response from */
export type Reverberation = {
  /** the lowpass over the tail in Hz at its start and by its end, as hard surfaces keep their highs longer than soft ones */
  brightness: readonly [start: number, end: number]
  /** seconds until the tail has fallen by 60 dB */
  decay: number
  /** discrete early reflections: seconds after the predelay and their level */
  early?: ReadonlyArray<readonly [time: number, level: number]>
  /** a flutter echo between parallel walls: seconds between the slaps, how many and the level of the first */
  flutter?: readonly [gap: number, count: number, level: number]
  /** seconds between the dry sound and the first reflection */
  predelay: number
  /** how loud the reverberation is mixed under the dry sound */
  wet: number
}

const impulses = new WeakMap<BaseAudioContext, WeakMap<Reverberation, AudioBuffer>>

/**
 * The stereo impulse response of a room, made once per context: exponentially decaying noise whose lowpass closes over the tail, after a predelay and a few discrete early reflections or a flutter echo, normalized to unit energy, so `wet` alone sets how much of the room is heard.
 * It is seeded, so a room always answers alike.
 */
export function reverberationImpulse(context: BaseAudioContext, room: Reverberation) {
  let rooms = impulses.get(context)
  if (!rooms) {
    rooms = new WeakMap
    impulses.set(context, rooms)
  }
  let buffer = rooms.get(room)
  if (buffer) {
    return buffer
  }
  const {sampleRate} = context
  const length = Math.ceil((room.predelay + room.decay * 1.1) * sampleRate)
  buffer = context.createBuffer(2, length, sampleRate)
  const [brightStart, brightEnd] = room.brightness
  const start = Math.floor(room.predelay * sampleRate)
  const reflections = [...room.early ?? []]
  if (room.flutter) {
    const [gap, count, level] = room.flutter
    for (let k = 1; k <= count; k++) {
      reflections.push([gap * k, level * 0.72 ** (k - 1)])
    }
  }
  let energy = 0
  for (let channel = 0; channel < 2; channel++) {
    const next = seededRandom(3 * 7919 + channel * 104_729)
    const data = buffer.getChannelData(channel)
    let smoothed = 0
    for (let i = start; i < length; i++) {
      const time = (i - start) / sampleRate
      const cutoff = brightStart * (brightEnd / brightStart) ** Math.min(1, time / room.decay)
      smoothed += (1 - Math.exp(-2 * Math.PI * cutoff / sampleRate)) * (next() - smoothed)
      // −60 dB at the decay time; the first 3 ms fade in, so the onset never clicks.
      data[i] = smoothed * Math.exp(-6.9 * time / room.decay) * Math.min(1, time / 0.003)
    }
    for (const [time, level] of reflections) {
      // Each channel hears a reflection a little apart, which widens the room.
      const at = start + Math.floor((time + (channel ? 0.0007 : 0)) * sampleRate)
      for (let j = 0; j < 48 && at + j < length; j++) {
        data[at + j] += level * (channel ? -1 : 1) * Math.exp(-j / 9) * (0.5 + 0.5 * next())
      }
    }
    for (const sample of data) {
      energy += sample * sample
    }
  }
  const normalize = 1 / Math.sqrt(energy / 2)
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < data.length; i++) {
      data[i] *= normalize
    }
  }
  rooms.set(room, buffer)
  return buffer
}

/** The acoustics of a room that rings on as `room` describes: its generated reverberation mixed under the dry sound. */
export default function reverberation(room: Reverberation): RoomAcoustics {
  return (context, input, output) => {
    const convolver = new ConvolverNode(context, {
      buffer: reverberationImpulse(context, room),
      disableNormalization: true,
    })
    const wet = new GainNode(context, {gain: room.wet})
    input.connect(output)
    input.connect(convolver).connect(wet).connect(output)
    return () => {
      input.disconnect()
      convolver.disconnect()
      wet.disconnect()
    }
  }
}

/** a seeded generator of values in −1–1 */
function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = Math.imul(state, 1_664_525) + 1_013_904_223 >>> 0
    return state / 2_147_483_648 - 1
  }
}

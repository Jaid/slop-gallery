import type {FusionOutcome} from '../../src/lib/gallery/fusion/Fusion.ts'

import FusionSound from '../../src/lib/audio/FusionSound.ts'
import {portalEnvelope} from '../../src/lib/gallery/fusion/envelope.ts'
import {introOrbitRate, orbitAngle} from '../../src/lib/gallery/fusion/orbit.ts'
import {fusionTiming} from '../../src/lib/gallery/fusion/timing.ts'

type Outcome = Exclude<FusionOutcome['kind'], 'abort'>

const rate = 48_000
const effectsGain = 0.6 * 10 ** (12 / 20)
/** how often the portal’s frame updates the sound, in seconds; the offline context suspends at render quanta */
const step = 0.05
const assert: (condition: boolean, message: string) => asserts condition = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}
/**
 * Renders a fusion’s sound offline – by default one that succeeds after the image model took 6.5 s and one that fails after 1 s – and checks it for silence, headroom and a silent tail. No audible output, DOM, input, focus or viewport changes.
 * With `listen`, every result carries its render as a base64 WAV.
 */
export default async function verify({listen = false, scenarios = [['success', 6.5], ['failure', 1]]}: {
  listen?: boolean
  /** each fusion’s outcome and when the image model answered, in seconds */
  scenarios?: ReadonlyArray<readonly [Outcome, number]>
} = {}) {
  const results = []
  for (const [outcome, resultAt] of scenarios) {
    results.push(await check(outcome, resultAt, listen))
  }
  return results
}
/** Renders one fusion and checks its sound. */
async function check(outcome: Outcome, resultAt: number, listen: boolean) {
  const {buffer, end} = await render(outcome, resultAt)
  let peak = 0
  let power = 0
  let tail = 0
  const tailStart = Math.ceil((end + 2.6) * rate)
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    for (const [index, sample] of buffer.getChannelData(channel).entries()) {
      assert(Number.isFinite(sample), `the ${outcome} rendered a nonfinite sample`)
      peak = Math.max(peak, Math.abs(sample))
      power += sample * sample
      if (index >= tailStart) {
        tail = Math.max(tail, Math.abs(sample))
      }
    }
  }
  assert(peak > 0.01, `the ${outcome} rendered silence`)
  assert(peak < 0.9, `the ${outcome} exceeded headroom with ${peak}`)
  assert(tail < 0.0005, `the ${outcome} did not finish silently: ${tail}`)
  return {
    outcome,
    resultAt,
    seconds: Number(buffer.duration.toFixed(2)),
    peak: Number(peak.toFixed(4)),
    rms: Number(Math.sqrt(power / buffer.length / buffer.numberOfChannels).toFixed(5)),
    tail: Number(tail.toFixed(6)),
    ...listen ? {wav: wav(buffer)} : {},
  }
}
/** 16-bit stereo WAV of the buffer, for listening to a render. */
function wav(buffer: AudioBuffer) {
  const channels = buffer.numberOfChannels
  const frames = buffer.length
  const bytes = new DataView(new ArrayBuffer(44 + frames * channels * 2))
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++) {
      bytes.setUint8(offset + index, value.codePointAt(index)!)
    }
  }
  text(0, 'RIFF')
  bytes.setUint32(4, 36 + frames * channels * 2, true)
  text(8, 'WAVEfmt ')
  bytes.setUint32(16, 16, true)
  bytes.setUint16(20, 1, true)
  bytes.setUint16(22, channels, true)
  bytes.setUint32(24, rate, true)
  bytes.setUint32(28, rate * channels * 2, true)
  bytes.setUint16(32, channels * 2, true)
  bytes.setUint16(34, 16, true)
  text(36, 'data')
  bytes.setUint32(40, frames * channels * 2, true)
  const data = Array.from({length: channels}, (_, channel) => buffer.getChannelData(channel))
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      bytes.setInt16(44 + (frame * channels + channel) * 2, Math.max(-1, Math.min(1, data[channel][frame])) * 32_767, true)
    }
  }
  const encoded = new Uint8Array(bytes.buffer)
  return encoded.toBase64()
}
/** Renders one fusion’s sound offline, heard from four meters in front of its portal, with the portal’s own envelope driving it every 50 ms like the frames do. */
async function render(outcome: Outcome, resultAt: number) {
  const {afterglow, climax, fizzle} = fusionTiming
  const at = Math.max(resultAt, outcome === 'success' ? fusionTiming.minimum : fusionTiming.intro)
  const end = outcome === 'success' ? at + climax + afterglow : at + fizzle
  const seconds = end + 3
  const context = new OfflineAudioContext(2, Math.ceil(rate * seconds), rate)
  const master = context.createGain()
  master.gain.value = effectsGain
  master.connect(context.destination)
  context.listener.positionZ.value = 4
  context.listener.positionY.value = 1.7
  const sound = new FusionSound({
    context,
    master,
  }, [0, 1.85, 0])
  const settled = {
    kind: outcome,
    at,
  }
  const emergedAt = at + climax
  let turn = -1
  let stage = 'brewing'
  const failures: Array<unknown> = []
  for (let time = 0; time < end + step / 2; time += step) {
    const moment = time
    context.suspend(moment).then(() => {
      if (moment >= end) {
        sound.stop()
      } else {
        const known = moment >= resultAt ? settled : undefined
        const emerged = outcome === 'success' && moment >= emergedAt ? emergedAt : undefined
        const envelope = portalEnvelope(moment, known, emerged, fusionTiming, 2)
        if (moment === 0) {
          sound.open(fusionTiming)
        }
        let next = stage
        if (emerged !== undefined) {
          next = 'emerged'
        } else if (known && moment > known.at) {
          next = outcome === 'success' ? 'climax' : 'fizzle'
        }
        if (next !== stage) {
          stage = next
          if (stage === 'climax') {
            sound.climax(at + climax - moment)
          } else if (stage === 'emerged') {
            sound.emerge()
          } else {
            sound.fizzle(fizzle)
          }
        }
        if (stage === 'brewing' && envelope.image && 'turn' in envelope.image && envelope.image.turn !== turn) {
          turn = envelope.image.turn
          sound.surface(turn)
        }
        const climaxing = outcome === 'success' && known ? {
          at,
          duration: climax,
        } : undefined
        sound.update({
          energy: envelope.energy,
          orbit: moment < fusionTiming.intro ? introOrbitRate(moment, fusionTiming) : (orbitAngle(0, moment, climaxing) - orbitAngle(0, moment - 0.01, climaxing)) / 0.01,
          spin: envelope.spin,
        })
      }
      return context.resume()
    }).catch((error: unknown) => failures.push(error))
  }
  const buffer = await context.startRendering()
  assert(!failures.length, `the ${outcome}’s timeline failed: ${String(failures[0])}`)
  return {
    buffer,
    end,
  }
}

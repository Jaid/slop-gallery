import FusionSound from '../../src/lib/audio/FusionSound.ts'
import {fusionEffects} from '../../src/lib/gallery/fusion/effects/index.ts'
import {portalFrame} from '../../src/lib/gallery/fusion/portalFrame.ts'

const rate = 48_000
const effectsGain = 0.6 * 10 ** (12 / 20)
/** seconds every sound gets to ring out after its effect is over */
const ringing = 3
const assert: (condition: boolean, message: string) => asserts condition = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}
/** a portal 1.8 m up in front of a wall, in a room 6 m deep with 3 m to either side */
const frame = portalFrame({
  position: [0, 1.8, -1.2],
  rotation: 0,
}, {
  floor: 0,
  room: 6,
  sides: [3, 3],
})

/**
 * Renders the sound of every effect an ingredient can contribute to a fusion’s portal offline, together with the portal’s own as the result flips out, heard from 4 m in front of the portal, and checks it for silence, headroom and a silent tail. No audible output, DOM, input, focus or viewport changes.
 * `effects` limits it to the effects with those ids.
 */
export default async function verify({effects}: {effects?: ReadonlyArray<string>} = {}) {
  const results = []
  for (const effect of fusionEffects) {
    if (effects && !effects.includes(effect.id)) {
      continue
    }
    const seconds = effect.afterglow + ringing
    const context = new OfflineAudioContext(2, Math.ceil(rate * seconds), rate)
    const master = context.createGain()
    master.gain.value = effectsGain
    master.connect(context.destination)
    context.listener.positionY.value = 1.7
    context.listener.positionZ.value = frame.center[2] + 4
    const output = {
      context,
      master,
    }
    const portal = new FusionSound(output, frame.center)
    portal.emerge()
    effect.sound(output, frame)
    const buffer = await context.startRendering()
    let peak = 0
    let effectPeak = 0
    let tail = 0
    // The portal’s own boom has rung out by then.
    const effectStart = Math.ceil(1.5 * rate)
    const tailStart = Math.ceil((seconds - 0.5) * rate)
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      for (const [index, sample] of buffer.getChannelData(channel).entries()) {
        assert(Number.isFinite(sample), `${effect.id} rendered a nonfinite sample`)
        peak = Math.max(peak, Math.abs(sample))
        if (index >= tailStart) {
          tail = Math.max(tail, Math.abs(sample))
        } else if (index >= effectStart) {
          effectPeak = Math.max(effectPeak, Math.abs(sample))
        }
      }
    }
    assert(effectPeak > 0.005, `${effect.id} fell silent once the portal’s boom had rung out`)
    assert(peak < 0.9, `${effect.id} exceeded headroom with ${peak}`)
    assert(tail < 0.0005, `${effect.id} did not finish silently: ${tail}`)
    results.push({
      effect: effect.id,
      seconds: Number(seconds.toFixed(2)),
      peak: Number(peak.toFixed(4)),
      tail: Number(tail.toFixed(6)),
    })
  }
  return results
}

import type {FusionOutcome} from './Fusion.ts'
import type {FusionTiming} from './timing.ts'

import {clamp, fade} from 'math'

import {ingredientAt} from './timing.ts'

/** how a fusion’s portal looks at a moment, which the portal’s uniforms, its light and its sound follow */
export type PortalEnvelope = {
  /** seconds since the latest burst of sparks, and how bright it is */
  burst: number
  burstStrength: number
  /** how far the portal has died down to embers, 0–1 */
  embers: number
  /** how strongly it glows, about 1 while it brews */
  energy: number
  /** a white blaze over the middle */
  flash: number
  /** what the disc shows: an ingredient by its index, the result or nothing */
  image?: {
    clarity: number
    index: number
    /** which turn of the ingredients this is, counting from 0, for the sound of each new one */
    turn: number
  } | {
    clarity: number
    result: true
  }
  /** how bright its light is, in candela */
  light: number
  /** seconds since the latest shockwave left the rim, and how bright it is */
  pulse: number
  pulseStrength: number
  /** the disc’s size, 1 for its full radius */
  size: number
  /** radians per second the vortex turns */
  spin: number
}

/** how long the portal takes to open */
const opening = 0.6
/** when the shockwave of the opening leaves the rim */
const openingPulse = 0.12
/** when, as a share of the fizzle, the dying portal pops */
const fizzlePop = 0.55
/** how bright the portal’s light glows while it brews, in candela */
const brewingLight = 28
const easeOutBack = (t: number) => 1 + 2.6 * (t - 1) ** 3 + 1.6 * (t - 1) ** 2
/** a flicker in 0–1 that jumps 25 times a second */
const flicker = (seconds: number) => {
  const step = Math.floor(seconds * 25)
  const hash = Math.sin(step * 12.9898) * 43_758.5453
  return hash - Math.floor(hash)
}

/** The portal `elapsed` seconds into a fusion with `ingredients` images, which the outcome and the moment its result emerged shape. */
export function portalEnvelope(elapsed: number, outcome: FusionOutcome | undefined, emergedAt: number | undefined, timing: FusionTiming, ingredients: number): PortalEnvelope {
  const brewing = brew(elapsed, timing, ingredients)
  if (outcome?.kind === 'failure' && elapsed > outcome.at) {
    const progress = clamp((elapsed - outcome.at) / timing.fizzle, 0, 1)
    const fading = brew(outcome.at, timing, ingredients)
    const image = fading.image && 'index' in fading.image ? {
      ...fading.image,
      clarity: fading.image.clarity * clamp(1 - progress * 3, 0, 1),
    } : undefined
    const energy = 0.9 * (1 - progress) * (0.55 + 0.45 * flicker(elapsed))
    const popped = elapsed - outcome.at - fizzlePop * timing.fizzle
    return {
      ...brewing,
      image,
      embers: fade(clamp(progress / 0.4, 0, 1)),
      energy,
      spin: 1.6 * (1 - progress),
      size: (1 - fade(clamp((progress - fizzlePop) / (1 - fizzlePop), 0, 1))) * (1 + Math.sin(elapsed * 60) * 0.08 * (1 - progress)),
      pulse: popped < 0 ? 10 : popped,
      pulseStrength: 0.6,
      burst: popped < 0 ? 10 : popped,
      burstStrength: 0.5,
      flash: 0,
      light: brewingLight * energy,
    }
  }
  if (outcome?.kind !== 'success' || elapsed <= outcome.at) {
    return brewing
  }
  const progress = clamp((elapsed - outcome.at) / timing.climax, 0, 1)
  // The ingredient sinks away quickly, and the result surfaces in its place.
  const sinking = brew(outcome.at, timing, ingredients).image
  const image = progress < 0.12 && sinking && 'index' in sinking ? {
    ...sinking,
    clarity: sinking.clarity * (1 - progress / 0.12),
  } : {
    result: true as const,
    clarity: fade(clamp((progress - 0.12) / 0.38, 0, 1)),
  }
  if (emergedAt === undefined) {
    const energy = 1 + 0.8 * progress ** 2
    return {
      ...brewing,
      image,
      energy,
      spin: 1.6 + 6 * progress ** 2,
      // It draws in as the satellites fall into it, then swells just before it lets go.
      size: 1 - 0.18 * Math.sin(Math.PI * Math.min(progress / 0.8, 1)) + 0.2 * fade(clamp((progress - 0.8) / 0.2, 0, 1)),
      flash: 0.5 * fade(clamp((progress - 0.85) / 0.15, 0, 1)),
      light: brewingLight * energy + 50 * progress ** 3,
    }
  }
  // The result is out: a blaze, a shockwave and a burst of sparks, then the portal collapses.
  const after = Math.max(0, elapsed - emergedAt)
  const energy = 1.8 * Math.exp(-after * 2.2)
  const size = (1 - fade(clamp((after - 0.12) / 0.6, 0, 1))) * (1.2 + 0.25 * Math.exp(-after * 8))
  return {
    ...brewing,
    image: {
      result: true,
      clarity: clamp(1 - after / 0.3, 0, 1),
    },
    energy,
    spin: 7.6 * Math.exp(-after * 1.5),
    size,
    flash: 0.9 * Math.exp(-after * 6),
    pulse: after,
    pulseStrength: 1.4,
    burst: after,
    burstStrength: 1,
    light: brewingLight * energy + 110 * Math.exp(-after * 3.5),
  }
}

/** The portal opening and brewing, showing the ingredients in turn. */
function brew(elapsed: number, timing: FusionTiming, ingredients: number): PortalEnvelope {
  const opened = clamp(elapsed / opening, 0, 1)
  const ingredient = ingredientAt(elapsed, ingredients, timing)
  const energy = clamp(elapsed / 0.5, 0, 1) * (0.92 + 0.08 * Math.sin(elapsed * 3.1) + 0.05 * Math.sin(elapsed * 7.3))
  // A small shockwave greets every ingredient as it starts to surface.
  const sinceTurn = ingredient ? (elapsed - timing.gather) % timing.ingredient : 10
  return {
    burst: 10,
    burstStrength: 0,
    embers: 0,
    energy,
    flash: 0.6 * Math.exp(-elapsed * 9),
    image: ingredient,
    light: brewingLight * energy,
    pulse: elapsed < timing.gather ? elapsed - openingPulse : sinceTurn,
    pulseStrength: elapsed < timing.gather ? (elapsed < openingPulse ? 0 : 1) : 0.35,
    // It swells a little while an ingredient shows, so the image reads.
    size: easeOutBack(opened) * (1 + 0.03 * Math.sin(elapsed * 2.3) + 0.14 * (ingredient?.clarity ?? 0)),
    // The vortex quickens the longer the image model takes.
    spin: 1.6 + 0.04 * Math.min(elapsed, 30),
  }
}

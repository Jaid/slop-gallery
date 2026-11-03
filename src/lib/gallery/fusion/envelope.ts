import type {FusionOutcome} from './Fusion.ts'
import type {FusionTiming} from './timing.ts'

import {clamp, fade} from 'math'

import {beats, choreographed, gathering, implosion, introClock, release, ringFall, turns, whirl, whirling} from './intro.ts'
import {clarityBetween, imageAt} from './timing.ts'

/** what the portal’s disc shows: one of the images by its index, or the result */
export type PortalImage = {
  clarity: number
  index: number
  /** which turn of the images this is, counting from 0, for the sound of each new one */
  turn: number
} | {
  clarity: number
  result: true
}
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
  image?: PortalImage
  /** how strongly it bends the view around it, 0–1 */
  lens: number
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

/** when, as a share of the fizzle, the dying portal pops */
const fizzlePop = 0.55
/** how bright the portal’s light glows while it brews, in candela */
const brewingLight = 28
/** a flicker in 0–1 that jumps 25 times a second */
const flicker = (seconds: number) => {
  const step = Math.floor(seconds * 25)
  const hash = Math.sin(step * 12.9898) * 43_758.5453
  return hash - Math.floor(hash)
}

/** The portal `elapsed` seconds into a fusion showing `images` images, which its intro, the outcome, the moment its result emerged and the moment the player broke it off shape. */
export function portalEnvelope(elapsed: number, outcome: FusionOutcome | undefined, emergedAt: number | undefined, timing: FusionTiming, images: number, canceledAt?: number): PortalEnvelope {
  const envelope = shaped(elapsed, outcome, emergedAt, timing, images)
  return canceledAt === undefined || elapsed < canceledAt ? envelope : recoiled(envelope, elapsed, elapsed - canceledAt)
}

/** The portal brewing once its intro is over, showing the images in turn until the outcome is in. The intro settles into it as it ends, and the ring of fire the intro’s slingshot left behind lands in it with a blaze, a big shockwave and a burst of sparks. */
export function brewing(elapsed: number, timing: FusionTiming, images: number): PortalEnvelope {
  const shown = imageAt(elapsed, images, timing)
  const energy = 0.92 + 0.08 * Math.sin(elapsed * 3.1) + 0.05 * Math.sin(elapsed * 7.3)
  const landed = elapsed - timing.intro
  const calm: PortalEnvelope = {
    burst: 10,
    burstStrength: 0,
    embers: 0,
    energy,
    flash: 0,
    image: shown,
    lens: 1,
    light: brewingLight * energy,
    // A small shockwave greets every image as it starts to surface.
    pulse: Math.max(0, landed) % timing.image,
    pulseStrength: 0.35,
    // It swells a little while an image shows, so it reads.
    size: 1 + 0.03 * Math.sin(elapsed * 2.3) + 0.14 * (shown?.clarity ?? 0),
    // The vortex quickens the longer the image model takes.
    spin: 1.6 + 0.04 * Math.min(elapsed, 30),
  }
  if (landed < 0) {
    return calm
  }
  // The ring of fire lands: the portal blazes up, swells and lurches, and a big shockwave greets it instead of the first image’s.
  const landing = landed < timing.image
  const onset = Math.min(landed / 0.03, 1)
  const swell = Math.sin(Math.PI / 2 * Math.min(landed / 0.08, 1)) * Math.exp(-landed * 5)
  return {
    ...calm,
    burst: landing ? landed : calm.burst,
    burstStrength: landing ? 1.2 : 0,
    energy: energy + onset * Math.exp(-landed * 4) + 1 - onset,
    flash: 1.3 * Math.exp(-landed * 7),
    light: calm.light + 140 * Math.exp(-landed * 4.5),
    pulseStrength: landing ? 2 : calm.pulseStrength,
    size: calm.size * (1 + 0.38 * swell),
    spin: calm.spin + 6 * onset * Math.exp(-landed * 3),
  }
}

/**
 * The portal `since` seconds after the player broke it off, at `elapsed` seconds into the fusion: it recoils at once with a blaze, a shockwave, a burst of sparks and a violent shudder while its vortex lurches and its colors char, and then flickers on half burnt out until it fizzles.
 * Breaking it off only fails it at the next turn of the images, so this is what tells the player right away.
 */
function recoiled(envelope: PortalEnvelope, elapsed: number, since: number): PortalEnvelope {
  const jolt = Math.exp(-since * 7)
  const sputter = 0.7 + 0.3 * flicker(elapsed)
  // The recoil’s shockwave and sparks until the portal’s own come after them.
  const shockwave = since < envelope.pulse
  const sparks = since < envelope.burst
  return {
    ...envelope,
    burst: sparks ? since : envelope.burst,
    burstStrength: sparks ? 1 : envelope.burstStrength,
    embers: Math.max(envelope.embers, 0.3 + 0.45 * jolt),
    energy: envelope.energy * sputter + 0.9 * jolt,
    flash: Math.max(envelope.flash, 1.1 * Math.exp(-since * 10)),
    light: envelope.light * sputter + 90 * Math.exp(-since * 6),
    pulse: shockwave ? since : envelope.pulse,
    pulseStrength: shockwave ? 1.8 : envelope.pulseStrength,
    size: envelope.size * (1 + 0.25 * jolt * Math.sin(since * 75)),
    spin: envelope.spin * (1 - 1.8 * jolt),
  }
}
/** The portal as long as nobody broke it off. */
function shaped(elapsed: number, outcome: FusionOutcome | undefined, emergedAt: number | undefined, timing: FusionTiming, images: number): PortalEnvelope {
  const brewed = elapsed < timing.intro ? opening(elapsed, timing, images) : brewing(elapsed, timing, images)
  if (outcome?.kind === 'failure' && elapsed > outcome.at) {
    const progress = clamp((elapsed - outcome.at) / timing.fizzle, 0, 1)
    const fading = brewing(outcome.at, timing, images)
    const image = fading.image && 'index' in fading.image ? {
      ...fading.image,
      clarity: fading.image.clarity * clamp(1 - progress * 3, 0, 1),
    } : undefined
    const energy = 0.9 * (1 - progress) * (0.55 + 0.45 * flicker(elapsed))
    const popped = elapsed - outcome.at - fizzlePop * timing.fizzle
    return {
      ...brewed,
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
    return brewed
  }
  const progress = clamp((elapsed - outcome.at) / timing.climax, 0, 1)
  // The image sinks away quickly, and the result surfaces in its place.
  const sinking = brewing(outcome.at, timing, images).image
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
      ...brewed,
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
    ...brewed,
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
/** the portal’s size after each beat of the ember, and the ember’s once the motes are in */
const growth = [0.32, 0.55, 0.75, 1] as const
const easeOutBack = (t: number) => 1 + 2.6 * (t - 1) ** 3 + 1.6 * (t - 1) ** 2
/** The portal during the intro (see `intro.ts`): a dark singularity feeding on the view, bursting into an ember that the motes kindle and that beats into the portal, which spins up as it whirls the satellites around and draws in the ring of fire they left, settling into {@link brewing} by its end. */
function opening(elapsed: number, timing: FusionTiming, images: number): PortalEnvelope {
  const t = introClock(elapsed, timing)
  if (t < implosion) {
    // A dark ball with a burning rim, which grows as it feeds and collapses to a point right before it bursts.
    const feeding = t / implosion
    const collapse = 1 - 0.85 * fade(clamp((t - implosion + 0.15) / 0.15, 0, 1))
    return {
      burst: 10,
      burstStrength: 0,
      embers: 0,
      energy: 0.45 + 0.3 * feeding,
      flash: 0.5 * Math.exp(-t * 12),
      image: undefined,
      lens: 0,
      light: 4 + 8 * feeding,
      pulse: 10,
      pulseStrength: 0,
      size: (0.14 + 0.2 * feeding ** 2) * fade(clamp(t / 0.15, 0, 1)) * collapse,
      spin: 3 + 10 * feeding ** 2,
    }
  }
  const burst = t - implosion
  const kindled = fade(clamp((t - gathering[0]) / (gathering[1] - gathering[0]), 0, 1))
  // The burst pops it wide before it shrinks to an ember, which grows as the motes stream in and a step with every beat.
  let size = 0.12 + (growth[0] - 0.12) * kindled + 0.5 * easeOutBack(clamp(burst / 0.12, 0, 1)) * Math.exp(-burst * 6)
  let kick = 0
  let since = burst
  let latest = -1
  for (const [index, beat] of beats.entries()) {
    const after = t - beat
    if (after < 0) {
      continue
    }
    size += (growth[index + 1] - growth[index]) * fade(clamp(after / 0.25, 0, 1))
    // Lub, dub.
    kick += 0.22 * Math.exp(-after * 9) + (after >= 0.2 ? 0.12 * Math.exp(-(after - 0.2) * 9) : 0)
    since = after
    latest = index
  }
  const ignited = latest === beats.length - 1 ? since : undefined
  const image = introImage(t, images)
  const energy = 0.55 + 0.4 * kindled + 1.4 * Math.exp(-burst * 5) + (latest >= 0 ? 0.7 * Math.exp(-since * 5) : 0) + (ignited === undefined ? 0 : 1.2 * Math.exp(-ignited * 3))
  let pulseStrength = 1.4
  if (latest >= 0) {
    pulseStrength = ignited === undefined ? 0.75 : 1.6
  }
  const own: PortalEnvelope = {
    burst: ignited ?? burst,
    burstStrength: ignited === undefined ? 1 : 0.9,
    embers: 0,
    energy,
    // The ignition only kindles the slingshot, which builds to a blaze of its own.
    flash: 0.6 * Math.exp(-burst * 8) + (ignited === undefined ? 0 : 0.28 * Math.exp(-ignited * 8)),
    image,
    // The ember bends the view once the room has stopped wobbling.
    lens: (0.4 * kindled + 0.6 * fade(clamp((t - beats[2] + 0.3) / 0.6, 0, 1))) * fade(clamp((t - 1.9) / 0.4, 0, 1)),
    light: brewingLight * energy * Math.min(1, size + 0.2) + 40 * Math.exp(-burst * 5),
    pulse: since,
    pulseStrength,
    size: size + kick + 0.12 * (image?.clarity ?? 0),
    spin: 1.2 + 1.2 * kindled + 4 * Math.exp(-burst * 2) + (ignited === undefined ? 0 : 3 * Math.exp(-ignited * 2)),
  }
  // It settles into the brewing portal over its last half second.
  const weight = fade(clamp((t - choreographed + 0.55) / 0.55, 0, 1))
  let settled = own
  if (weight > 0) {
    const brewed = brewing(elapsed, timing, images)
    const mix = (a: number, b: number) => a + (b - a) * weight
    settled = {
      ...own,
      energy: mix(own.energy, brewed.energy),
      flash: mix(own.flash, brewed.flash),
      lens: mix(own.lens, brewed.lens),
      light: mix(own.light, brewed.light),
      size: mix(own.size, brewed.size),
      spin: mix(own.spin, brewed.spin),
    }
  }
  if (t <= whirl) {
    return settled
  }
  // It spins up with the whirl, flares as it lets go and draws the ring of fire in.
  const speed = whirling(t)
  const fall = ringFall(t)
  const letGo = t - release
  return {
    ...settled,
    energy: settled.energy + 0.5 * speed + fall,
    flash: settled.flash + (letGo < 0 ? 0 : 0.35 * Math.exp(-letGo * 25)),
    light: settled.light + 25 * speed + 30 * fall,
    size: settled.size * (1 - 0.08 * speed - 0.15 * Math.sin(Math.PI * fall)),
    spin: settled.spin + 12 * speed + 6 * Math.sin(Math.PI * fall),
  }
}
/** The ingredient whose satellite the ember yanks in `t` seconds into the choreography, as its turn of the surfacing motif. */
function introImage(t: number, images: number): PortalImage | undefined {
  for (const [index, [from, to]] of turns.entries()) {
    if (index < images && t >= from && t < to) {
      return {
        index,
        turn: index,
        clarity: clarityBetween(t, from, to),
      }
    }
  }
}

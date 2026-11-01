import type {Vec3} from '../types.ts'
import type GatheringMotes from './GatheringMotes.ts'
import type RealityWarp from './RealityWarp.ts'
import type {FusionTiming} from './timing.ts'

import {clamp, fade} from 'math'

/**
 * How a fusion opens, once and never looped, over its first {@link FusionTiming.intro} seconds. Its moments are choreographed in seconds of a {@link choreographed}-second intro and stretch with the timing’s.
 *
 * A singularity tears open in front of the work and sucks at everything around it: a wide stretch of the room bends toward it, twisting like water down a drain and darkening, while the work is torn from its wall and what was thrown into it is dragged along. Full, it collapses and bursts, the room snaps back like jelly and the burst knocks both loose into the air.
 * The light it flung out streams back in and kindles an ember, which beats like a heart: the first beat yanks the work into place beside the ember, the second what was thrown into it, each surfacing in the ember as it arrives, and the third ignites the ember into the portal and sets both circling it.
 * At that, the portal lashes a strand out to each, which pulls taut and draws its soul out and, just as the intro ends, lets go and reels the soul into the portal, leaving both to circle it freely.
 *
 * The portal’s envelope, the satellites’ orbit and the fusion’s sound play their parts of it; this module holds its moments and drives the warp, the motes and the siphons.
 */
export const choreographed = 4
/** when the singularity, full, collapses and bursts */
export const implosion = 1.15
/** when the pull tears each satellite loose and drags it in, the work first */
export const drags = [0.15, 0.27] as const
/** how much of its way to the singularity the pull drags a satellite before the burst */
export const dragged = 0.62
/** when the motes start streaming back in and when the last of them is in */
export const gathering = [1.2, 1.95] as const
/** when the ember beats: the first yanks in the work, the second what was thrown into it, the third ignites the portal */
export const beats = [1.8, 2.45, 3.1] as const
/** how long after its beat the ember yanks its satellite in */
export const yank = 0.1
/** when the portal lashes a strand out to each satellite to draw its soul out, the work’s first, right after the last beat */
export const seizures = [beats[2], beats[2] + 0.06] as const
/** how long a strand takes to lash out to its satellite */
const lunge = 0.12
/** when the souls tear loose and the strands start reeling them in, which lands them in the portal as the intro ends */
export const slurp = 3.55
/** when each ingredient shows in the ember, as its satellite is yanked in */
export const turns = [[1.86, 2.45], [2.51, 3.1]] as const
/** how long the satellites take after the last beat to come up to the orbit’s speed */
export const departure = choreographed - beats[2]
/** how far the view bends around the singularity, in meters */
const warpReach = 4.6
/** how much faster than their own clock the motes stream back in, which takes them about 1.4 s */
const moteRush = 1.85

/** seconds into the choreography, `elapsed` real seconds into the fusion */
export function introClock(elapsed: number, {intro}: Pick<FusionTiming, 'intro'>) {
  return elapsed * choreographed / intro
}

/** real seconds into the fusion of a moment `seconds` into the choreography */
export function introSeconds(seconds: number, {intro}: Pick<FusionTiming, 'intro'>) {
  return seconds * intro / choreographed
}

/** Drives the warp and the motes `elapsed` seconds into the fusion, showing each only while it plays. */
export function decorateIntro({motes, warp}: {
  motes: GatheringMotes
  warp: RealityWarp
}, elapsed: number, timing: FusionTiming, normal: Vec3) {
  const t = elapsed < timing.intro ? introClock(elapsed, timing) : choreographed
  warp.visible = t < 2.5
  if (warp.visible) {
    const {chroma, darkness, front, pull, reach, ripple, twist} = warp.uniforms
    reach.value = warpReach
    if (t < implosion) {
      // The pull grows ever faster and shudders; the view twists and darkens toward the middle.
      const grip = clamp((t - 0.04) / (implosion - 0.04), 0, 1)
      pull.value = 2.7 * grip ** 1.6 + 0.09 * Math.sin(t * 61) * grip
      twist.value = 2.6 * grip ** 2
      darkness.value = 0.92 * grip ** 1.4
      chroma.value = 0.06 * grip
      ripple.value = 0
      front.value = 0
    } else {
      // The room snaps back, overshoots and wobbles like jelly, while a ripple runs out over it.
      const after = t - implosion
      pull.value = -0.85 * Math.exp(-after * 4.2) * Math.cos(after * 15)
      twist.value = 2.6 * Math.exp(-after * 9) * Math.cos(after * 11)
      darkness.value = 0.92 * Math.exp(-after * 30)
      chroma.value = 0.09 * Math.exp(-after * 3)
      ripple.value = 0.07 * Math.exp(-after * 2)
      front.value = after * 1.3
    }
  }
  const streaming = (t - gathering[0]) * moteRush
  motes.visible = streaming > 0 && streaming < 1.45
  if (motes.visible) {
    motes.uniforms.clock.value = streaming
    motes.uniforms.energy.value = 1
    motes.uniforms.normal.value.fromArray(normal)
  }
}

/**
 * How the siphon of satellite `index` draws its soul `elapsed` seconds into the fusion, or nothing outside the intro’s end: it lashes out from the portal with a hook of light at its head, pulls ever tauter, thicker and brighter while the soul swells at its end and beads run along it ever faster, and from {@link slurp} reels the soul into the portal ever faster, landing it there as the intro ends.
 * `reach` is how far out toward the satellite the soul’s end is, from 0 at the portal’s middle, and `flow` how far the beads have run, in radians of their pattern.
 */
export function introSiphon(index: number, elapsed: number, timing: FusionTiming) {
  const t = introClock(elapsed, timing)
  const seizure = seizures[Math.min(index, 1)]
  const seized = t - seizure
  if (seized < 0 || t >= choreographed) {
    return
  }
  const drawing = fade(clamp((seized - lunge) / (slurp - seizure - lunge), 0, 1))
  const reeled = clamp((t - slurp) / (choreographed - slurp), 0, 1)
  return {
    flow: 9 * (1.5 * seized + 2.2 * seized ** 2),
    glow: 1.1 + 1.6 * Math.exp(-seized * 7) + 0.7 * drawing,
    reach: fade(clamp(seized / lunge, 0, 1)) * (1 - reeled ** 2),
    slack: 1 - 0.8 * drawing,
    soul: 0.45 + 1.05 * drawing + 0.7 * reeled,
    width: 0.75 + 0.65 * drawing - 0.25 * reeled,
  }
}

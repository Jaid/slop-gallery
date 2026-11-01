import type {Vec3} from '../types.ts'
import type GatheringMotes from './GatheringMotes.ts'
import type RealityWarp from './RealityWarp.ts'
import type {FusionTiming} from './timing.ts'

import {clamp, fade} from 'math'

/**
 * How a fusion opens, once and never looped, over its first {@link FusionTiming.intro} seconds. Its moments are choreographed in seconds of a {@link choreographed}-second intro and stretch with the timing’s.
 *
 * A singularity tears open in front of the work and sucks at everything around it: a wide stretch of the room bends toward it, twisting like water down a drain and darkening, while the work is torn from its wall and what was thrown into it is dragged along. Full, it collapses and bursts, the room snaps back like jelly and the burst knocks both loose into the air.
 * The light it flung out streams back in and kindles an ember, which beats like a heart: the first beat lashes a leash out to the work and yanks it into place beside the ember, the second does the same to what was thrown into it, each surfacing in the ember as it arrives, and the third ignites the ember into the portal and sets both circling it.
 *
 * The portal’s envelope, the satellites’ orbit and the fusion’s sound play their parts of it; this module holds its moments and drives the warp, the motes and the tethers.
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
/** when the ember beats: the first leashes the work, the second what was thrown into it, the third ignites the portal */
export const beats = [1.8, 2.45, 3.1] as const
/** how long a leash takes to lash out to its satellite after its beat */
export const lash = 0.1
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

/** How the tether of satellite `index` binds it `elapsed` seconds into the intro: nothing until its beat, then a leash lashing out bright and calming once the satellite hangs on it, glowing like the brewing portal’s once the last beat set them off. */
export function introTether(index: number, elapsed: number, timing: FusionTiming) {
  const t = introClock(elapsed, timing)
  const beat = beats[Math.min(index, 1)]
  if (t < beat) {
    return {
      glow: 0,
      reach: 0,
    }
  }
  const glow = 0.8 + 1.4 * Math.exp(-(t - beat) * 4)
  return {
    glow: glow + (1 - glow) * fade(clamp((t - beats[2]) / 0.8, 0, 1)),
    reach: fade(clamp((t - beat) / lash, 0, 1)),
  }
}

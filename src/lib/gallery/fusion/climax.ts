import type {FusionOutcome} from './Fusion.ts'
import type {FusionTiming} from './timing.ts'

import {clamp, fade} from 'math'

/**
 * How a successful fusion plays its climax and the moment its result flips out: the room imploding into the portal and rebounding, the ingredients’ images marbling together in its disc and the blow the view takes. Everything here is a pure function of where the fusion is.
 * `progress` runs from 0 to 1 over the climax, while the satellites spiral into the portal; `after` counts seconds since the result flipped out.
 */
export type ClimaxMoment = {
  after?: number
  progress?: number
}

/** the warp’s uniforms */
export type WarpState = {
  chroma: number
  darkness: number
  front: number
  pull: number
  ripple: number
  twist: number
}

/** Where the fusion is in its climax `elapsed` seconds in: nothing before it, `progress` during it and `after` once the result flipped out. */
export function climaxMoment(elapsed: number, outcome: FusionOutcome | undefined, emergedAt: number | undefined, timing: Pick<FusionTiming, 'climax'>): ClimaxMoment {
  if (emergedAt !== undefined && elapsed >= emergedAt) {
    return {after: elapsed - emergedAt}
  }
  if (outcome?.kind === 'success' && elapsed > outcome.at) {
    return {progress: clamp((elapsed - outcome.at) / timing.climax, 0, 1)}
  }
  return {}
}

/** Implosion and rebound: the warp’s uniforms. The room is dragged into the portal after the spiraling satellites, darkening and twisting toward it, and when the result flips out it is blasted back out, overshooting like jelly while a ripple runs over it. */
export function reboundWarp({after, progress}: ClimaxMoment): WarpState | undefined {
  if (progress !== undefined) {
    const grip = progress ** 1.5
    return {
      chroma: 0.05 * grip,
      darkness: 0.4 * progress ** 2,
      front: 0,
      pull: 0.75 * grip + 0.04 * Math.sin(progress * 90) * progress,
      ripple: 0,
      twist: 1.5 * progress ** 2,
    }
  }
  if (after !== undefined && after < 1.4) {
    return {
      chroma: 0.12 * Math.exp(-after * 3),
      darkness: 0.4 * Math.exp(-after * 40),
      front: after * 1.5,
      pull: -0.6 * Math.exp(-after * 4.5) * Math.cos(after * 13),
      ripple: 0.12 * Math.exp(-after * 2.2) * (1 - fade(clamp((after - 1) / 0.4, 0, 1))),
      twist: -1.6 * Math.exp(-after * 7) * Math.cos(after * 9),
    }
  }
}

/** Implosion and rebound: the comet trail a satellite drags behind it as it spirals into the portal, ever longer, hotter and more wound, gone the moment the result flips out. `sweep` is how many radians it has circled since the climax began. */
export function reboundTrail({progress}: ClimaxMoment, sweep: number) {
  if (progress === undefined) {
    return
  }
  return {
    energy: fade(clamp(progress / 0.15, 0, 1)) * (1.2 + 2.6 * progress ** 2),
    length: Math.min(4.2, sweep * 0.75),
    spiral: 0.9 * (1 - progress) + 0.25,
    width: 0.7 + 1.1 * progress,
  }
}

/** Marbled confluence: how strongly the ingredients’ images marble together in the disc and how far out the result has crystallized out of them, in radii of the disc. Over the first half of the climax they pour in and stir, then the result grows out of the middle, and it has filled the disc by the time it flips out. */
export function confluence({after, progress}: ClimaxMoment) {
  if (progress !== undefined) {
    return {
      clarity: fade(clamp(progress / 0.18, 0, 1)),
      crystal: 1.2 * fade(clamp((progress - 0.45) / 0.5, 0, 1)) ** 1.4,
      marble: fade(clamp(progress / 0.18, 0, 1)),
    }
  }
  if (after !== undefined) {
    return {
      clarity: clamp(1 - after / 0.3, 0, 1),
      crystal: 1.2,
      marble: 0,
    }
  }
}

/** Impact frame: the blow the view takes, as the screen impact’s uniforms, for a player `distance` meters from the portal. The view slowly draws back through the climax and, as the result flips out, punches in and springs back, shakes, swells its bloom and sends a refracting ring out from the portal, split into its colors. */
export function impact({after, progress}: ClimaxMoment, distance: number) {
  const nearness = clamp(1.4 - distance / 8, 0.35, 1)
  if (progress !== undefined) {
    return {
      aberration: 0.004 * progress ** 2 * nearness,
      bloom: 1 + 0.35 * progress ** 2,
      cap: 1 + progress ** 2,
      punch: -0.022 * fade(progress) * nearness,
      ring: 0,
      ringStrength: 0,
      shake: 0.0015 * progress ** 3 * nearness,
    }
  }
  if (after !== undefined && after < 1.5) {
    const settle = 1 - fade(clamp((after - 1) / 0.5, 0, 1))
    return {
      aberration: 0.014 * Math.exp(-after * 5) * nearness * settle,
      bloom: 1 + 1.1 * Math.exp(-after * 4) * settle,
      cap: 1 + 2.5 * Math.exp(-after * 4) * settle,
      punch: (0.05 * Math.exp(-after * 6) * Math.cos(after * 15) - 0.022 * Math.exp(-after * 30)) * nearness * settle,
      ring: 0.05 + after * 1.5,
      ringStrength: 0.04 * Math.exp(-after * 2.6) * nearness * settle,
      shake: 0.011 * Math.exp(-after * 6) * nearness * settle,
    }
  }
}

import {clamp} from 'math'

/** how long the parts of a fusion take, in seconds */
export type FusionTiming = {
  /** The portal closes after the result flipped out of it. */
  afterglow: number
  /** The work and what was thrown into it spiral into the portal before the result flips out. */
  climax: number
  /** A failed fusion hands the work back to its wall and spits out what was thrown into it. */
  fizzle: number
  /** The portal opens and the work and what was thrown into it fly into orbit around it. */
  gather: number
  /** Each ingredient surfaces in the portal for this long, one after another, over and over until the outcome is in. */
  ingredient: number
  /** The outcome never shows before this, however fast the image model answers. */
  minimum: number
}

/** Opening the portal and showing both ingredients once takes exactly the minimum. */
export const fusionTiming: FusionTiming = {
  gather: 1,
  ingredient: 1.5,
  minimum: 4,
  climax: 1.3,
  afterglow: 1.6,
  fizzle: 1,
}

/** the share of an ingredient’s turn it takes to surface from the swirl, and again to sink back into it */
const surfacing = 0.24

/** The ingredient the portal shows `elapsed` seconds into a fusion of `count` ingredients and how clearly, from 0, lost in the swirl, to 1; none while the portal opens. */
export function ingredientAt(elapsed: number, count: number, {gather, ingredient}: Pick<FusionTiming, 'gather' | 'ingredient'> = fusionTiming) {
  if (elapsed < gather || count === 0 || ingredient <= 0) {
    return
  }
  const turn = Math.floor((elapsed - gather) / ingredient)
  const progress = (elapsed - gather) / ingredient - turn
  return {
    index: turn % count,
    turn,
    clarity: Math.min(clamp(progress / surfacing, 0, 1), clamp((1 - progress) / surfacing, 0, 1)),
  }
}

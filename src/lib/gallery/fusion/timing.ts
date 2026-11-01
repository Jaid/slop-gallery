import {clamp} from 'math'

/** how long the parts of a fusion take, in seconds */
export type FusionTiming = {
  /** The portal closes after the result flipped out of it. */
  afterglow: number
  /** The work and what was thrown into it spiral into the portal before the result flips out. */
  climax: number
  /** A failed fusion hands the work back to its wall and spits out what was thrown into it. */
  fizzle: number
  /** After the intro, each ingredient surfaces in the portal for this long, one after another, over and over until the outcome is in. */
  ingredient: number
  /** The ceremony opens with this, once and never looped: the portal forms, takes hold of the work and what was thrown into it and shows each ingredient once, until both orbit it. */
  intro: number
  /** The outcome never shows before this, however fast the image model answers. */
  minimum: number
}

/** The intro fills the minimum, which every fusion waits for anyway. */
export const fusionTiming: FusionTiming = {
  intro: 4,
  ingredient: 1.5,
  minimum: 4,
  climax: 1.3,
  afterglow: 1.6,
  fizzle: 1,
}

/** how many turns of the ingredients the intro shows, one each, which the turns after it count on from */
export const introTurns = 2
/** the share of an image’s turn it takes to surface from the swirl, and again to sink back into it */
const surfacing = 0.24

/** How clearly an image whose turn lasts from `from` to `to` seconds shows `elapsed` seconds in, from 0, lost in the swirl, to 1. */
export function clarityBetween(elapsed: number, from: number, to: number) {
  const progress = (elapsed - from) / (to - from)
  if (progress < 0 || progress > 1) {
    return 0
  }
  return Math.min(clamp(progress / surfacing, 0, 1), clamp((1 - progress) / surfacing, 0, 1))
}

/** Seconds into a fusion that the next turn of the ingredients begins, `elapsed` seconds in, the end of the intro while it plays: the beat of the loop on which a fusion the player broke off fizzles. */
export function nextTurn(elapsed: number, {ingredient, intro}: Pick<FusionTiming, 'ingredient' | 'intro'> = fusionTiming) {
  if (elapsed <= intro || ingredient <= 0) {
    return Math.max(elapsed, intro)
  }
  return intro + Math.ceil((elapsed - intro) / ingredient) * ingredient
}

/** The ingredient the portal shows `elapsed` seconds into a fusion of `count` ingredients and how clearly, once its intro is over; the intro shows its own. */
export function ingredientAt(elapsed: number, count: number, {ingredient, intro}: Pick<FusionTiming, 'ingredient' | 'intro'> = fusionTiming) {
  if (elapsed < intro || count === 0 || ingredient <= 0) {
    return
  }
  const turn = Math.floor((elapsed - intro) / ingredient)
  const start = intro + turn * ingredient
  return {
    index: (introTurns + turn) % count,
    turn: introTurns + turn,
    clarity: clarityBetween(elapsed, start, start + ingredient),
  }
}

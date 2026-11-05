import type {Vec3} from './types.ts'

import {wallFace} from './architectureDimensions.ts'
import forge, {forgeVestibule} from './forge.ts'
import Gutter from './Gutter.ts'
import PassageRoute from './passages/PassageRoute.ts'
import {salonCeiling} from './salon.ts'

type Point = readonly [x: number, z: number]

const northZ = forge.center[1] - forge.size[1] / 2
const {center: [vestibuleX, vestibuleZ]} = forgeVestibule
/** the radius of the hook the gutter swings round onto the vestibule’s axis */
const hookRadius = 1
/** how far east of the vestibule’s middle the gutter ends on its axis, heading west at the arch onto the Bastion */
const spoutReach = 1
/** how far behind where the funnel drops orbs into it the gutter’s closed head lies */
const headReach = 0.25
/** how high over the floor the gutter’s bottom lies at its closed head */
const head = 3.6
/** how steeply it falls */
const grade = 0.05
/** Where the funnel drops orbs into it, the gutter opens into a wider mouth, its rims leaning in past upright, which takes in an orb coming in off its middle and keeps it from bouncing out. */
const catchment = {
  length: 0.5,
  lip: Math.PI * 100 / 180,
  radius: 0.3,
} as const
/**
 * The funnel behind the opening on the vestibule’s side, which takes in every orb the backstop stops: a brass cone, its rim a little in front of the vestibule’s wall, narrowing down a cone of `slope` radians into a short throat over the gutter.
 * All values are in meters.
 */
const funnel = {
  radius: 0.36,
  /** the radius of the throat inside, wide enough for an orb to drop through with a little room to spare */
  throat: 0.17,
  slope: Math.PI * 35 / 180,
  /** how long the throat runs straight down under the cone */
  neck: 0.06,
  /** how far in front of the vestibule’s wall its rim stays, far enough for the gutter’s closed head under it to keep clear of the wall too */
  gap: 0.07,
  /** how far over the rims of the gutter’s mouth under it the throat ends */
  clearance: 0.03,
} as const
/** where the funnel stands in plan: in front of the vestibule’s wall, straight behind the opening */
const drop: Point = [vestibuleX, northZ - wallFace - funnel.gap - funnel.radius]
/** the middle of the hook’s circle, a hook’s radius south of where the gutter ends */
const hookCenter: Point = [vestibuleX + spoutReach, vestibuleZ + hookRadius]
/** the direction of the gutter’s straight run from under the funnel: off the line from there to the hook’s middle, by as much as it takes to touch the hook’s circle on its left */
const lineHeading = (() => {
  const [dx, dz] = [hookCenter[0] - drop[0], hookCenter[1] - drop[1]]
  return Math.atan2(dz, dx) + Math.asin(hookRadius / Math.hypot(dx, dz))
})()
/** how far the straight run reaches from under the funnel to the hook, where it touches the hook’s circle */
const lineReach = Math.sqrt(Math.hypot(hookCenter[0] - drop[0], hookCenter[1] - drop[1]) ** 2 - hookRadius ** 2)

/**
 * The gutter in the vestibule: from its closed head under the funnel behind the opening out along a straight run, then round a hook onto the vestibule’s axis, ending in the air heading west at the arch onto the Bastion’s approach, where orbs fly off into the vestibule.
 * It hangs from the ceiling all the way.
 */
export const forgeGutter = new Gutter(new PassageRoute([drop[0] - Math.cos(lineHeading) * headReach, drop[1] - Math.sin(lineHeading) * headReach], lineHeading, 0, 1, [
  {length: headReach + lineReach},
  {
    radius: hookRadius,
    angle: -(Math.PI + lineHeading),
  },
]), {
  catch: catchment,
  closed: true,
  head,
  grade,
  ceiling: salonCeiling.underside,
  hung: [[0, headReach + lineReach + hookRadius * (Math.PI + lineHeading)]],
})

/** how high the throat’s lower end lies: over the rims of the gutter’s mouth under it */
const throatBottom = forgeGutter.bottom(headReach) + forgeGutter.radiusAt(headReach) * (1 - Math.cos(forgeGutter.lipAt(headReach))) + forgeGutter.thickness + funnel.clearance
/** how high the funnel’s rim lies */
const rimY = throatBottom + funnel.neck + (funnel.radius - funnel.throat) * Math.tan(funnel.slope)
/** how high the opening’s middle lies: high enough for an orb flying through it to pass over the funnel’s rim into the backstop */
const openingY = rimY + 0.4

/**
 * What takes in an orb the alchemy machine’s cannon shoots through the opening, on the vestibule’s side of it: a padded backstop straight behind it, which an orb strikes dead, and a funnel under the backstop, which the orb drops into and which drops it into the gutter’s mouth.
 * All values are in meters, in the world’s frame.
 */
export const forgeHopper = {
  funnel: {
    ...funnel,
    /** the middle of its rim */
    center: [drop[0], rimY, drop[1]] as Vec3,
    /** how deep it reaches under its rim, down to the throat’s lower end */
    depth: rimY - throatBottom,
  },
  /**
   * The padded backstop: an upright board over the funnel’s far rim, its face toward the opening, from a little under the rim to well over the opening, as wide as the funnel.
   * Orbs strike it dead, without bouncing back, and slide down its face into the funnel.
   */
  backstop: {
    /** where its face stands, north of the opening */
    face: drop[1] - funnel.radius,
    bottom: rimY - 0.06,
    top: openingY + 0.45,
    width: funnel.radius * 2 + 0.12,
    thickness: 0.08,
  },
}

/**
 * The middle of the round opening the alchemy machine’s cannon shoots orbs through, out of the Forge into its vestibule: where the Forge’s north wall and the vestibule’s round wall touch, their center lines meeting over the middle of the arch through both, the one place they stand as one.
 */
export const forgeOpeningCenter: Vec3 = [vestibuleX, openingY, northZ]

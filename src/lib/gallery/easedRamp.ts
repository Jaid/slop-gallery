import {clamp} from 'math'

/** At most this far apart along a ramp, its eased profile runs straight from knot to knot. */
export const rampKnotSpacing = 0.25

/** how many straight stretches a ramp `length` meters long takes, none longer than `spacing` */
const stretches = (length: number, spacing: number) => Math.max(1, Math.ceil(length / spacing))
const eased = (t: number) => t * t * (3 - 2 * t)

/**
 * How far up a ramp `length` meters long a point `along` meters into it has climbed, as a fraction of its whole rise: level where it starts and where it ends, steepest halfway, like the ramp up the Oculus’ tower.
 * The eased profile runs straight from knot to knot, at most `spacing` apart, so rendering, collision and navigation share it wherever they follow it through its knots.
 */
export default function easedRamp(along: number, length: number, spacing = rampKnotSpacing) {
  const count = stretches(length, spacing)
  const position = clamp(along / length, 0, 1) * count
  const index = Math.min(Math.floor(position), count - 1)
  const from = eased(index / count)
  return from + (eased((index + 1) / count) - from) * (position - index)
}

/** How steeply the eased profile climbs `along` meters into a ramp `length` meters long, as a fraction of its whole rise per meter: halfway, 1.5 times as steeply as a straight ramp would. */
export function easedRampGradient(along: number, length: number) {
  const t = clamp(along / length, 0, 1)
  return 6 * t * (1 - t) / length
}

/** where the knots of a ramp `length` meters long lie, in meters into it, from its start to its end */
export function easedRampKnots(length: number, spacing = rampKnotSpacing) {
  const count = stretches(length, spacing)
  return Array.from({length: count + 1}, (_, i) => length * i / count)
}

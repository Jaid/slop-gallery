import type {RouteTurn} from './PassageRoute.ts'

import PassageRoute from './PassageRoute.ts'

/** in how many steps of growing curvature a turn eases into its radius */
const easingSteps = 12

/**
 * A turn by `angle` round a `radius`, easing into it and back out over `easing` meters at both ends in steps of evenly growing curvature, like a railway’s transition curves, so whatever rolls round it along a channel climbs the channel’s side gently instead of being flung up it and swinging on.
 * Returns its steps for a route and where it ends, laid out from the origin heading along x.
 */
export default function easedTurn(radius: number, angle: number, easing: number) {
  const side = Math.sign(angle)
  const ease = Array.from({length: easingSteps}, (_, step): RouteTurn => {
    const curvature = (step + 0.5) / easingSteps / radius
    return {
      radius: 1 / curvature,
      angle: side * easing / easingSteps * curvature,
    }
  })
  // Each easing turns by half as much as as long a stretch of the radius would.
  const eased = easing / radius / 2
  if (!(Math.abs(angle) > eased * 2)) {
    throw new RangeError('A turn has to turn further than its easing does.')
  }
  const steps: Array<RouteTurn> = [
    ...ease,
    {
      radius,
      angle: side * (Math.abs(angle) - eased * 2),
    },
    ...ease.toReversed(),
  ]
  const route = new PassageRoute([0, 0], 0, 0, 1, steps)
  const {point, heading} = route.end
  return {
    steps,
    end: point,
    heading,
  }
}

/** How far before the corner where the line it sets off along meets the line back from its end the turn starts, as {@link easedTurn} lays it out. */
export function turnReach({end: [x, z], heading}: ReturnType<typeof easedTurn>) {
  return x - z * Math.cos(heading) / Math.sin(heading)
}

/** An eased turn by `angle` with as many meters of `easing` at both ends whose ends lie `across` meters apart straight across the line it sets off along, like those of a plain turn round half that by half a revolution, found by narrowing down its radius. */
export function easedTurnAcross(across: number, angle: number, easing: number) {
  let low = easing / Math.abs(angle) * 1.000001
  let high = across * 4
  for (let i = 0; i < 64; i++) {
    const radius = (low + high) / 2
    if (Math.abs(easedTurn(radius, angle, easing).end[1]) > across) {
      high = radius
    } else {
      low = radius
    }
  }
  return easedTurn((low + high) / 2, angle, easing)
}

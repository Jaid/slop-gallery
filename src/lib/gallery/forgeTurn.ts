import type {Wall, WallOpening} from '../placement/wallGeometry.ts'
import type {Vec3} from './types.ts'

import {wallCoordinates} from '../placement/wallGeometry.ts'
import {cannonFlight, cannonTarget} from './alchemy/alchemyMachine.ts'
import {wallFace} from './architectureDimensions.ts'
import {forgeVestibule} from './forge.ts'
import {orbRadius} from './orbs/index.ts'

const [vestibuleX, vestibuleZ] = forgeVestibule.center
const {radius} = forgeVestibule
/** the radius of its bore, roomy for an orb flying into its mouth */
const bore = 0.21
const startFall = cannonFlight.fall
/** how far the orb’s middle lies under the bore’s middle once it rests on the bore’s bottom, the colliders’ skin and a hair kept apart */
const slack = bore - orbRadius - 0.015
/**
 * The middle of the pipe’s mouth: as far over the orb’s middle there, square to the way both run, as the orb’s middle lies under the bore’s once it rests on the bore’s bottom.
 * The orb flies in already resting on the bottom, which then takes it over without a knock, falling as steeply as it does.
 */
const [mouthX, mouthY, mouthZ] = (() => {
  const [x, y, z] = cannonTarget.mouth
  const norm = Math.hypot(1, startFall)
  return [x, y + slack / norm, z - slack * startFall / norm]
})()
/** how far the mouth stands out from the vestibule’s north wall */
const reach = mouthZ - (vestibuleZ - radius + wallFace)
/** The outlet's center, at the height marked on the Bastion approach wall. */
const outletY = 0.63
/** how steeply it still falls toward its outlet, per meter along it */
const endFall = 0.01
/** from its mouth straight north to the center line of the vestibule’s wall */
const inletRun = mouthZ - (vestibuleZ - radius)
/** One semicircular counter-clockwise hairpin behind the north wall, ending opposite the requested Bastion approach opening. */
const returnX = vestibuleX - 8.3
const turnRadius = (vestibuleX - returnX) / 2
const loop = turnRadius * Math.PI
const loopCenter = [vestibuleX - turnRadius, vestibuleZ - radius] as const
/** The pipe returns straight south into the curved Bastion approach wall near its middle. */
const outletWallZ = vestibuleZ - 0.08
const outletRun = 0.27
const returnRun = outletWallZ - (vestibuleZ - radius)
const length = inletRun + loop + returnRun + outletRun
const outletCrossing = inletRun + loop + returnRun
/** how far along it its fall eases from the shot’s, which it takes over at its mouth, to its gentle fall toward the outlet, as much as the drop from its mouth to its outlet allows */
const ease = 3 * (mouthY - outletY - endFall * length) / (startFall - endFall)
if (mouthX !== vestibuleX || !(reach > 0) || !(ease > 0 && ease < length)) {
  throw new RangeError('The redirection pipe needs its mouth on the vestibule’s axis, in front of its wall, falling more steeply there than toward its outlet.')
}
/** How steeply the pipe falls `along` meters along it in plan, per meter: from the shot’s fall at its mouth, easing smoothly into its gentle fall toward its outlet. */
function fall(along: number) {
  const left = Math.max(0, 1 - along / ease)
  return endFall + (startFall - endFall) * left * left
}
/** How high the pipe’s middle lies `along` meters along it in plan, the fall summed up from its mouth. */
function height(along: number) {
  const left = 1 - Math.min(along, ease) / ease
  return mouthY - endFall * along - (startFall - endFall) * ease / 3 * (1 - left ** 3)
}
/** Where the pipe’s middle lies in plan `along` meters along it, and which way it runs there. */
function plan(along: number): {
  direction: readonly [x: number, z: number]
  point: readonly [x: number, z: number]
} {
  if (along <= inletRun) {
    return {
      point: [mouthX, mouthZ - along],
      direction: [0, -1],
    }
  }
  if (along <= inletRun + loop) {
    const angle = (along - inletRun) / turnRadius
    return {
      point: [loopCenter[0] + turnRadius * Math.cos(angle), loopCenter[1] - turnRadius * Math.sin(angle)],
      direction: [-Math.sin(angle), -Math.cos(angle)],
    }
  }
  return {
    point: [returnX, vestibuleZ - radius + along - inletRun - loop],
    direction: [0, 1],
  }
}

/**
 * The Forge redirection pipe takes each cannon shot north through the vestibule wall, turns it once through a 180° counter-clockwise semicircle behind the wall, then runs straight south into the Bastion's curved approach wall. Its outlet is centered on the marked spot, without another elbow.
 * The pipe meets the orb at the cannon shot’s falling slope, then eases to a gentle descent toward the outlet above the approach's baseboard. Its polished bore guides the orb around the hairpin and launches it into the passage.
 * All values are in meters, in the world’s frame.
 */
export const forgeTurn = {
  bore,
  slack,
  thickness: 0.012,
  length,
  bend: {
    radius: turnRadius,
    start: inletRun,
    end: inletRun + loop,
  },
  /** distances along the centerline where it crosses the north vestibule wall and then the Bastion approach wall */
  crossings: {
    inlet: inletRun,
    outlet: outletCrossing,
  },
  /** where the inlet crosses the near face of the vestibule wall */
  faces: {
    inlet: inletRun - wallFace,
  },
  fall,
  /** Where the pipe’s middle lies `along` meters along it in plan and which way it runs there, in 3D. */
  at(along: number) {
    const {direction: [dx, dz], point: [x, z]} = plan(along)
    const down = fall(along)
    const norm = Math.hypot(1, down)
    return {
      point: [x, height(along), z] as Vec3,
      direction: [dx / norm, -down / norm, dz / norm] as Vec3,
    }
  },
} as const

/** Half-width of the close-fitting, round inlet on the vestibule wall. */
export function forgeTurnHoleHalfWidth() {
  const down = fall(forgeTurn.crossings.inlet)
  return (forgeTurn.bore + forgeTurn.thickness) * Math.hypot(1, down) + wallFace * down + 0.01
}

/** The pipe inlet's bare circular aperture through the vestibule wall. */
export function forgeTurnHole(wall: Pick<Wall, 'center' | 'curveRadius' | 'rotation'>, origin: Vec3): WallOpening {
  const [x, y, z] = forgeTurn.at(forgeTurn.crossings.inlet).point
  const halfWidth = forgeTurnHoleHalfWidth()
  const bottom = y - halfWidth - origin[1] - wall.center[1]
  return {
    u: wallCoordinates(wall, [x - origin[0], 0, z - origin[2]]),
    width: halfWidth * 2,
    bottom,
    height: bottom + halfWidth * 2,
    profile: 'round',
    casing: false,
  }
}

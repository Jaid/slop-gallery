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
/** how high the middle of its outlet lies, just high enough for the brass to clear the floor */
const outletY = 0.305
/** how steeply it still falls toward its outlet, per meter along it */
const endFall = 0.01
/** from its mouth straight north to the center line of the vestibule’s wall */
const inletRun = mouthZ - (vestibuleZ - radius)
/** The 180° counter-clockwise hairpin behind the north wall. Its far leg reaches back into the vestibule near the west arch. */
const turnRadius = 1.05
const loop = turnRadius * Math.PI
const loopCenter = [vestibuleX - turnRadius, vestibuleZ - radius] as const
const returnX = vestibuleX - 2 * turnRadius
/** The return leg follows the vestibule’s west side, then a broad elbow lines its outlet up with the Bastion arch. */
const returnEndZ = vestibuleZ - 0.85
const returnRun = returnEndZ - (vestibuleZ - radius)
const elbowRadius = 0.85
const elbow = elbowRadius * Math.PI / 2
const outletRun = 0.2
const length = inletRun + loop + returnRun + elbow + outletRun
/** Where the returning leg crosses the north-west quadrant of the circular wall, into the vestibule. */
const outletCrossing = inletRun + loop + radius - Math.sqrt(radius ** 2 - (2 * turnRadius) ** 2)
const outletFace = inletRun + loop + radius - Math.sqrt((radius - wallFace) ** 2 - (2 * turnRadius) ** 2)
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
  if (along <= inletRun + loop + returnRun) {
    return {
      point: [returnX, vestibuleZ - radius + along - inletRun - loop],
      direction: [0, 1],
    }
  }
  if (along <= inletRun + loop + returnRun + elbow) {
    const angle = (along - inletRun - loop - returnRun) / elbowRadius
    return {
      point: [returnX - elbowRadius + elbowRadius * Math.cos(angle), returnEndZ + elbowRadius * Math.sin(angle)],
      direction: [-Math.sin(angle), Math.cos(angle)],
    }
  }
  return {
    point: [returnX - elbowRadius - (along - inletRun - loop - returnRun - elbow), returnEndZ + elbowRadius],
    direction: [-1, 0],
  }
}

/**
 * The redirection pipe in the Forge’s vestibule, which turns every orb the alchemy machine’s cannon shoots through the arch round toward the Bastion, without slowing it: from its mouth low on the vestibule’s north wall, facing the arch, it runs north through the wall, round a 180° counter-clockwise hairpin behind it, and south through the north-west wall again. A rounded elbow in the vestibule aims its outlet west, sending the orb through the arch onto the Bastion’s approach.
 * It takes the shot over at its mouth at the very slope it falls there, the orb already resting on the bottom of its bore, and eases out into a gentle fall down to its outlet, just over the floor. Its bore is polished brass, which an orb slides round like a bobsled, without rolling and without bouncing, though pressed onto the bends at many times its weight, it leaves with only about three fifths of the speed it flew in with.
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
  /** how far along it in plan it crosses the center line of the vestibule’s wall, running in and running out again */
  crossings: {
    inlet: inletRun,
    outlet: outletCrossing,
  },
  /** how far along it in plan it crosses the face of the vestibule’s wall, running in and running out again */
  faces: {
    inlet: inletRun - wallFace,
    outlet: outletFace,
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

/** The low arch clears the return leg where it passes obliquely through the curved wall and alongside its projecting baseboard. */
const outletSlot = {
  halfWidth: 0.56,
  bottom: 0.03,
  height: 0.61,
  rise: 0.18,
} as const

/** Half the width of the opening where the pipe crosses the vestibule’s wall: a close-fitting round inlet and a broader baseboard-height arch on the return. */
export function forgeTurnHoleHalfWidth(crossing: keyof typeof forgeTurn.crossings) {
  if (crossing === 'outlet') {
    return outletSlot.halfWidth
  }
  const down = fall(forgeTurn.crossings.inlet)
  return (forgeTurn.bore + forgeTurn.thickness) * Math.hypot(1, down) + wallFace * down + 0.01
}

/** The bare aperture through the vestibule’s wall, in the wall’s coordinates relative to the room’s `origin`. */
export function forgeTurnHole(wall: Pick<Wall, 'center' | 'curveRadius' | 'rotation'>, origin: Vec3, crossing: keyof typeof forgeTurn.crossings): WallOpening {
  const [x, y, z] = forgeTurn.at(forgeTurn.crossings[crossing]).point
  const halfWidth = forgeTurnHoleHalfWidth(crossing)
  const inlet = crossing === 'inlet'
  const bottom = inlet ? y - halfWidth - origin[1] - wall.center[1] : outletSlot.bottom
  return {
    u: wallCoordinates(wall, [x - origin[0], 0, z - origin[2]]),
    width: halfWidth * 2,
    bottom,
    height: inlet ? bottom + halfWidth * 2 : outletSlot.height,
    profile: inlet ? 'round' : 'arch',
    ...inlet ? {} : {rise: outletSlot.rise},
    casing: false,
  }
}

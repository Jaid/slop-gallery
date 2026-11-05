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
/** how far the pipe’s mouth and its outlet stand out of the face of the vestibule’s wall */
const reach = mouthZ - (vestibuleZ - radius + wallFace)
/** how high the middle of its outlet lies, just high enough for the brass to clear the floor */
const outletY = 0.26
/** how steeply it still falls toward its outlet, per meter along it */
const endFall = 0.01
/** from its mouth straight north to the center line of the vestibule’s wall */
const inletRun = mouthZ - (vestibuleZ - radius)
/** round the loop behind the wall, as wide as the vestibule, which meets its wall’s center line where it runs in and where it runs out again */
const loop = radius * Math.PI * 3 / 2
/** from the wall’s center line straight west to its outlet */
const outletRun = wallFace + reach
const length = inletRun + loop + outletRun
/** the middle of the loop, north-east of the vestibule’s, as far from it north as east */
const loopCenter = [vestibuleX + radius, vestibuleZ - radius] as const
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
    const angle = (along - inletRun) / radius
    return {
      point: [loopCenter[0] - radius * Math.cos(angle), loopCenter[1] - radius * Math.sin(angle)],
      direction: [Math.sin(angle), -Math.cos(angle)],
    }
  }
  return {
    point: [loopCenter[0] - (along - inletRun - loop), vestibuleZ],
    direction: [-1, 0],
  }
}

/**
 * The redirection pipe in the Forge’s vestibule, which turns every orb the alchemy machine’s cannon shoots through the arch round toward the Bastion, without slowing it: from its mouth low on the vestibule’s north wall, facing the arch, it runs north through the wall, round a 270° loop behind it, as wide as the vestibule, and west through the wall again at the vestibule’s east side, where its outlet sends the orb rolling across the floor and out through the west arch onto the Bastion’s approach.
 * It takes the shot over at its mouth at the very slope it falls there, the orb already resting on the bottom of its bore, and eases out into a gentle fall down to its outlet, just over the floor. Its bore is polished brass, which an orb slides round like a bobsled, without rolling and without bouncing.
 * All values are in meters, in the world’s frame.
 */
export const forgeTurn = {
  bore,
  slack,
  thickness: 0.012,
  length,
  /** how far along it in plan it crosses the center line of the vestibule’s wall, running in and running out again */
  crossings: {
    inlet: inletRun,
    outlet: inletRun + loop,
  },
  /** how far along it in plan it crosses the face of the vestibule’s wall, running in and running out again */
  faces: {
    inlet: inletRun - wallFace,
    outlet: inletRun + loop + wallFace,
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

/** how much room the holes leave round the pipe: snug at the outlet, where it runs through level, out of the baseboard; at the steeply falling inlet a little more, which a plate covers */
const holeRoom = {
  inlet: 0.01,
  outlet: 0.004,
} as const

/** The radius of the round hole the pipe runs through the vestibule’s wall by, where it crosses the wall: round the brass, its section on the wall’s faces stretched by the pipe’s fall and set apart by it from face to face, with a little room. */
export function forgeTurnHoleRadius(crossing: keyof typeof forgeTurn.crossings) {
  const down = fall(forgeTurn.crossings[crossing])
  return (forgeTurn.bore + forgeTurn.thickness) * Math.hypot(1, down) + wallFace * down + holeRoom[crossing]
}

/** The round hole in the vestibule’s wall the pipe runs through where it crosses it, in the wall’s own coordinates relative to `origin`, the origin of the room the wall’s coordinates are given in, bare, without a casing. */
export function forgeTurnHole(wall: Pick<Wall, 'center' | 'curveRadius' | 'rotation'>, origin: Vec3, crossing: keyof typeof forgeTurn.crossings): WallOpening {
  const [x, y, z] = forgeTurn.at(forgeTurn.crossings[crossing]).point
  const holeRadius = forgeTurnHoleRadius(crossing)
  const bottom = y - holeRadius - origin[1] - wall.center[1]
  return {
    u: wallCoordinates(wall, [x - origin[0], 0, z - origin[2]]),
    width: holeRadius * 2,
    bottom,
    height: bottom + holeRadius * 2,
    profile: 'round',
    casing: false,
  }
}

const gravity = 9.81
/** How far along the pipe in plan an orb at the position, flying at the velocity, has flown into its mouth, if it has: inside the bore, between the mouth and a little past the wall, heading in. */
export function forgeTurnEntry([x, y, z]: Vec3, [, , vz]: Vec3) {
  const along = mouthZ - z
  if (along < 0 || along > inletRun + 0.4 || !(vz < 0)) {
    return
  }
  const [axisX, axisY] = forgeTurn.at(Math.min(along, inletRun)).point
  return Math.hypot(x - axisX, y - axisY) < bore ? along : undefined
}

/** Where an orb rides in the pipe `along` meters along it in plan: on the bottom of its bore, `slack` under its middle, square to the way it runs. */
function seat(along: number): Vec3 {
  const {direction: [dx, dy, dz], point} = forgeTurn.at(along)
  // Straight down, less its share along the pipe
  const down: Vec3 = [dy * dx, dy * dy - 1, dy * dz]
  const norm = Math.hypot(...down)
  return point.map((value, axis) => value + down[axis] / norm * slack) as Vec3
}
/** How far the pipe turns in plan between two points along it, in radians: round the loop, and nowhere else. */
function turned(from: number, to: number) {
  const overlap = Math.min(to, inletRun + loop) - Math.max(from, inletRun)
  return Math.max(overlap, 0) / radius
}

/**
 * An orb sliding through the pipe, out of the physics: it gains what its fall down the pipe gives it, and round the loop, pressed onto the polished bore at many times its weight, it loses a little to the bore with every radian it turns, as a rope slips round a capstan, keeping four fifths of its speed all the way round.
 * Rapier, which steps a ball pressed onto a faceted bend as a series of small collisions, would lose half of it, and some of that by chance.
 */
export class ForgeTurnRide {
  /** how much of its speed the bore takes per radian the loop turns it */
  static readonly drag = 0.04
  /** how far along the pipe in plan it is */
  along: number
  private velocity: number

  constructor(along: number, speed: number) {
    this.along = Math.max(0, along)
    this.velocity = speed
  }

  /** Slides it on by `seconds`; whether it has left the outlet. */
  advance(seconds: number) {
    const from = this.along
    this.along = Math.min(from + this.velocity * seconds / Math.hypot(1, fall(from)), length)
    const gained = this.velocity ** 2 + 2 * gravity * (height(from) - height(this.along))
    this.velocity = Math.sqrt(Math.max(gained, 0)) * Math.exp(-ForgeTurnRide.drag * turned(from, this.along))
    return this.along >= length
  }

  /** where its middle is, on the bottom of the bore */
  position() {
    return seat(this.along)
  }

  /** How it leaves the outlet: where, along the pipe at its speed, and spinning as it rolls on the floor. */
  release() {
    const velocity = forgeTurn.at(length).direction.map(value => value * this.velocity) as Vec3
    const [vx, , vz] = velocity
    return {
      position: seat(length),
      velocity,
      // Rolling west without slipping: the floor’s up crossed with its velocity
      spin: [vz / orbRadius, 0, -vx / orbRadius] as Vec3,
    }
  }

  speed() {
    return this.velocity
  }
}

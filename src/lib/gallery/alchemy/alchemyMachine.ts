import type {Wall, WallOpening} from '../../placement/wallGeometry.ts'
import type {Vec3} from '../types.ts'

import {weldedSurfaceSkin} from '../../physics/weldedSurface.ts'
import {wallCoordinates} from '../../placement/wallGeometry.ts'
import {wallFace} from '../architectureDimensions.ts'
import forge, {forgeVestibule} from '../forge.ts'
import {forgeHopper, forgeOpeningCenter} from '../forgeGutter.ts'
import {orbRadius} from '../orbs/index.ts'

const southZ = forge.center[1] + forge.size[1] / 2
/** where the face of the Forge’s south wall stands, which the alchemy machine stands against */
export const southWallFace = southZ - wallFace
const northZ = forge.center[1] - forge.size[1] / 2
/** how often the physics steps, in steps a second, and in how many substeps it integrates each, one for each of its solver’s iterations, as `<Physics>` of @react-three/rapier sets both by default; the cannon’s aim follows them substep by substep */
export const physicsSteps = {
  rate: 60,
  substeps: 4,
} as const
const gravity = -9.81

/**
 * The workbench against the middle of the Forge’s south wall, which the alchemy machine is built into: a long top of planks with eased edges over aprons on square legs, the round hole of the machine’s sink cut into its east end, left of its middle as seen from the room.
 * All values are in meters; its middle and its top’s height are in the world’s frame, everything else measured on the bench.
 */
export const workbench = {
  /** the middle of its top in plan, on the room’s axis, its back a hand’s width from the wall’s face */
  center: [forge.center[0], southWallFace - 0.05 - 0.45] as const,
  /** how long it is along the wall, east to west */
  length: 2.4,
  /** how deep it is, from the wall into the room */
  depth: 0.9,
  height: 0.92,
  /** how thick its top is */
  top: 0.045,
  /** how far its top reaches out over the aprons */
  overhang: 0.04,
  /** how deep its aprons hang under the top and how thick they are */
  apron: [0.11, 0.024],
  /** how thick its square legs are */
  leg: 0.07,
  /** how many planks its top is laid of, along its length */
  boards: 4,
} as const
const [benchX, benchZ] = workbench.center
/** how far the sink’s bowl turns round from upright at its rim down to the throat, in radians: it meets the throat at a fall of 25° */
const bowlSweep = Math.PI * 65 / 180

/**
 * The sink of the alchemy machine, which orbs are thrown or dropped into: a hammered brass bowl filling a round hole in the workbench’s top, flush with it, its walls running straight down through the top and curving in to a throat, which drops an orb into the machine’s body under the bench.
 * Its middle is in the world’s frame, the rest in meters.
 */
export const alchemySink = (() => {
  const radius = 0.36
  const throat = 0.17
  // The bowl is a quarter circle’s arc turning from upright at the rim by `bowlSweep`, down to the throat.
  const curve = (radius - throat) / (1 - Math.cos(bowlSweep))
  const rim = workbench.height - workbench.top
  return {
    /** the middle of its rim, flush with the bench’s top, as far in from the bench’s east end as its rim’s width and a hand more */
    center: [benchX + workbench.length / 2 - 0.12 - radius, workbench.height, benchZ] as Vec3,
    radius,
    /** the radius of the throat inside, wide enough for an orb to drop through with a little room to spare */
    throat,
    /** the radius of the bowl’s curve, which turns from the hole’s upright side under the top in toward the throat */
    curve,
    sweep: bowlSweep,
    /** how high the throat’s upper edge lies, where the bowl ends */
    throatY: rim - curve * Math.sin(bowlSweep),
    /** how thick its brass is */
    thickness: 0.012,
  }
})()

/**
 * The body of the alchemy machine under its sink, standing on the floor between the bench’s legs: an iron chest the sink’s throat runs down into, with a round window in its front glowing while it works on an orb.
 * Its pipe leaves it through its east side, low down. In meters, its middle in plan in the world’s frame.
 */
export const machineBody = {
  center: [alchemySink.center[0], benchZ] as const,
  /** across, up and deep: east to west, from the floor and from the wall into the room */
  size: [0.66, 0.4, 0.6] as const,
}

/** whether an orb with its middle at the position has dropped into the throat of the sink, out of reach of the bowl, so the machine takes it in: its middle under the bowl and over the throat */
export function inSinkThroat([x, y, z]: Vec3) {
  const [sinkX, , sinkZ] = alchemySink.center
  return y < alchemySink.throatY - 0.02 && y > machineBody.size[1] - 0.05 && Math.hypot(x - sinkX, z - sinkZ) < alchemySink.throat
}

/** How the cannon lies: on its iron bracket over the middle of the bench, its barrel pointing north along the room’s axis, raised by `elevation` radians. */
const elevation = Math.PI * 26 / 180
/** the barrel’s direction, north along the room’s axis and up */
const axis: Vec3 = [0, Math.sin(elevation), -Math.cos(elevation)]
/** how high the pipe runs west along the wall to the cannon */
const pipeRun = 1.95
/** how far the riser stands east of the bench’s east end, clear of it */
const riserX = benchX + workbench.length / 2 + 0.07 + 0.18
/** where the pipe’s run along the wall turns into the cannon, over the bench’s middle */
const turn: Vec3 = [benchX, pipeRun, benchZ]
/** how far up the barrel from where the pipe turns into it the cannon’s breech starts */
const feed = 0.32
const breech: Vec3 = [turn[0] + axis[0] * feed, turn[1] + axis[1] * feed, turn[2] + axis[2] * feed]
/** how long the barrel is, from its breech to its muzzle */
const barrel = 0.95
const muzzle: Vec3 = [breech[0] + axis[0] * barrel, breech[1] + axis[1] * barrel, breech[2] + axis[2] * barrel]

/**
 * The brass pipe the alchemy machine blasts an orb through, from its body up to the cannon: out of the body’s east side low down, east under the bench past its east end, up the south wall on brackets and west along it again to over the bench’s middle, where it turns north and up into the cannon’s breech.
 * Its corners are in the world’s frame, every one but the first and the last rounded by `bend`; its radii are meters.
 */
export const alchemyPipe = {
  corners: [
    [machineBody.center[0], 0.2, benchZ],
    [riserX, 0.2, benchZ],
    [riserX, pipeRun, benchZ],
    turn,
    breech,
  ] as ReadonlyArray<Vec3>,
  bend: 0.25,
  radius: 0.18,
  /** the radius of its bore, wide enough for an orb */
  bore: 0.165,
}

/**
 * The alchemy machine’s cannon, which shoots every orb the machine is done with across the Forge, under its rooflight, through the round opening over the arch into the vestibule: a bronze barrel on an iron bracket out of the south wall, fed by the pipe at its breech.
 * Its points are in the world’s frame, its lengths in meters.
 */
export const alchemyCannon = {
  axis,
  elevation,
  breech,
  muzzle,
  length: barrel,
  /** the radius of its bore, wide enough for an orb */
  bore: 0.17,
  /** how far down the barrel from its muzzle an orb starts, already flying */
  depth: 0.3,
}

/**
 * Where an orb flying from `position` at `velocity` is after every step of the physics, as Rapier integrates it: in each of a step’s substeps, gravity onto the velocity first, then the velocity onto the position.
 * That drops it lower than a parabola, by half of gravity times the time flown and a substep’s length: a few centimeters over a shot across the Forge.
 */
export function *flight(position: Vec3, velocity: Vec3): Generator<Vec3> {
  const substep = 1 / physicsSteps.rate / physicsSteps.substeps
  let [x, y, z] = position
  const [vx, , vz] = velocity
  let vy = velocity[1]
  for (;;) {
    for (let index = 0; index < physicsSteps.substeps; index++) {
      vy += gravity * substep
      x += vx * substep
      y += vy * substep
      z += vz * substep
    }
    yield [x, y, z]
  }
}

/** how high an orb flying from the cannon at `speed` m/s crosses the line where the Forge’s north wall and the vestibule’s round wall touch */
function heightAtOpening(start: Vec3, speed: number) {
  let previous = start
  for (const point of flight(start, axis.map(value => value * speed) as Vec3)) {
    if (point[2] <= northZ) {
      const share = (previous[2] - northZ) / (previous[2] - point[2])
      return previous[1] + (point[1] - previous[1]) * share
    }
    previous = point
  }
  throw new Error('An orb flies on forever.')
}

/**
 * How an orb leaves the cannon: its middle `depth` meters down the barrel from the muzzle, flying along the barrel at the speed that carries it, step by step, right through the middle of the round opening.
 */
export const cannonLaunch = (() => {
  const position = muzzle.map((value, index) => value - axis[index] * alchemyCannon.depth) as Vec3
  let [low, high] = [5, 40]
  for (let iteration = 0; iteration < 60; iteration++) {
    const middle = (low + high) / 2
    if (heightAtOpening(position, middle) < forgeOpeningCenter[1]) {
      low = middle
    } else {
      high = middle
    }
  }
  const speed = (low + high) / 2
  return {
    position,
    speed,
    velocity: axis.map(value => value * speed) as Vec3,
  }
})()

/** The orb’s flight from the cannon until it strikes the backstop behind the opening, after every step of the physics. */
export function cannonFlight() {
  const points: Array<Vec3> = []
  for (const point of flight(cannonLaunch.position, cannonLaunch.velocity)) {
    if (point[2] - orbRadius < forgeHopper.backstop.face) {
      return points
    }
    points.push(point)
  }
  return points
}

/**
 * The round opening the cannon shoots orbs through, in the Forge’s north wall and the vestibule’s round wall where they touch: as large round its middle as an orb flying through it on its way, step by step, takes up within both walls, and a little more for Rapier, which keeps a skin round the walls’ welded colliders and may stray from the flight it is aimed along by a fraction of a step.
 */
export const forgeOpening = (() => {
  const [centerX, centerY] = forgeOpeningCenter
  const [vestibuleX, vestibuleZ] = forgeVestibule.center
  /** how far a point lies out of either wall’s center line */
  const walls = [
    ([, , z]: Vec3) => z - northZ,
    ([x, , z]: Vec3) => forgeVestibule.radius - Math.hypot(x - vestibuleX, z - vestibuleZ),
  ]
  let reach = 0
  const points = cannonFlight()
  for (let index = 1; index < points.length; index++) {
    // Between the steps, finely enough that no part of the way through the walls is skipped
    for (let share = 0; share <= 1; share += 1 / 64) {
      const point = points[index - 1].map((value, coordinate) => value + (points[index][coordinate] - value) * share) as Vec3
      for (const offset of walls) {
        const into = Math.abs(offset(point)) - wallFace
        if (into >= orbRadius) {
          continue
        }
        // As far as the ball reaches out from its middle within the wall’s thickness
        const across = into > 0 ? Math.sqrt(orbRadius ** 2 - into ** 2) : orbRadius
        reach = Math.max(reach, Math.hypot(point[0] - centerX, point[1] - centerY) + across)
      }
    }
  }
  return {
    center: forgeOpeningCenter,
    radius: Math.ceil((reach + weldedSurfaceSkin + 0.02) * 100) / 100,
  }
})()

/** The round opening in a wall, in the wall’s own coordinates relative to `origin`, the origin of the room the wall’s coordinates are given in, bare, without a casing. */
export function forgeOpeningHole(wall: Pick<Wall, 'center' | 'curveRadius' | 'rotation'>, origin: Vec3): WallOpening {
  const [x, y, z] = forgeOpening.center
  const bottom = y - forgeOpening.radius - origin[1] - wall.center[1]
  return {
    u: wallCoordinates(wall, [x - origin[0], 0, z - origin[2]]),
    width: forgeOpening.radius * 2,
    bottom,
    height: bottom + forgeOpening.radius * 2,
    profile: 'round',
    casing: false,
  }
}

/** where the orb holder stands on the bench’s top, in the world’s frame: in the west half, right of the cannon as seen from the room */
export const holderSpot: Vec3 = [benchX - workbench.length / 4 - 0.1, workbench.height, benchZ]

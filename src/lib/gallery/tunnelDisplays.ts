import type {Wall} from '../placement/wallGeometry.ts'
import type {FloorRectangle} from './floors.ts'
import type {StairBeam} from './stairs/StairFlight.ts'
import type {Vec3} from './types.ts'

import {wallCoordinates} from '../placement/wallGeometry.ts'
import {wallFace} from './architectureDimensions.ts'
import lowerGallery, {tunnelFloorHeight} from './lowerGallery.ts'
import oculusBalcony from './oculusBalcony.ts'
import passageOrientation from './passages/orientation.ts'
import StairFlight, {stairThickness} from './stairs/StairFlight.ts'

const {oculus, tunnel} = lowerGallery
export const tunnelDisplayWindow = {
  bottom: 0.55,
  top: 2.85,
  width: tunnel.southZ - tunnel.northZ - 4.5,
  glassThickness: 0.06,
}
const centerZ = (tunnel.northZ + tunnel.southZ) / 2
const width = tunnelDisplayWindow.width
const northZ = centerZ - width / 2
const southZ = centerZ + width / 2
const floorY = tunnelFloorHeight(centerZ)
const depth = 3.2
const thickness = 0.18
const ceilingThickness = 0.18
/** A staff stairway runs down behind each display, from a door in the Oculus’ side wall at the balcony’s end out, then south and back in to a landing before a cutout in the display’s south end wall. It turns on flat floors, and the upper one runs on south as a gentle ramp down to the middle flight. */
export const displayStairway = {
  /** between the outsides of its walls, which stand inside it; the lower flight fills the gap between the display’s south end wall and Moonfall’s north wall */
  width: tunnel.southZ - (southZ + thickness - wallFace),
  /** over the grade, where its ceiling hangs, still below the floors of the Banquet and the Salon above */
  headroom: 2.8,
  /** how deep each step is; every flight takes whole steps */
  going: 0.4,
  /** how high each step rises; the drop takes as many steps as fit, the ramp before the middle flight falls by what they leave of it, and the middle flight takes the steps the upper and the lower flight leave */
  rise: 0.15,
  /** the least level floor behind the door, in front of its casing, before the first step down; it grows by what the lower flight’s whole steps leave of the way out */
  threshold: 0.4,
  /** how many steps the upper flight takes down from the door before the middle one turns south */
  upperSteps: 3,
  /** narrow enough for the door’s casing to fit on the balcony, between the south wall and the balcony’s edge */
  doorWidth: 1.8,
  /** low enough for the door’s casing to stay below the cornice of the Oculus’ side wall */
  doorHeight: 2.1,
  /** the cutout in the display’s south end wall, from the display’s back wall */
  cutoutWidth: 1.5,
}
const balconyY = oculusBalcony.position[1] + oculusBalcony.size[1] / 2
const balconyNorthZ = oculusBalcony.position[2] - oculusBalcony.size[2] / 2
/** where the doors sit along the side walls, halfway between the south wall’s face and the balcony’s edge */
const doorZ = (tunnel.northZ - wallFace + balconyNorthZ) / 2
export type DisplayBox = {
  position: Vec3
  size: Vec3
}
type DisplayAir = FloorRectangle & Record<'bottom' | 'top', number>
/** a floor of the stairway, at the height of `floor` along its north edge, which changes by `slope` per meter south on a ramp, with its ceiling hanging `headroom` over it */
type DisplayLevel = FloorRectangle & {
  floor: number
  headroom: number
  slope?: number
}
type Range = readonly [number, number]
const area = (x: Range, z: Range): FloorRectangle => ({
  center: [(x[0] + x[1]) / 2, (z[0] + z[1]) / 2],
  size: [Math.abs(x[1] - x[0]), Math.abs(z[1] - z[0])],
})
const air = (x: Range, z: Range, bottom: number, top: number): DisplayAir => {
  const {center, size} = area(x, z)
  return {
    center,
    size,
    bottom,
    top,
  }
}
/** the height of the level’s floor at `z` */
const levelFloor = ({center, size, floor, slope = 0}: DisplayLevel, z: number) => floor + (z - center[1] + size[1] / 2) * slope
/** a slab over the ranges, with its top at `top` at the start of the z range, from where it changes by `slope` per meter along z, tilted to match */
const slab = (name: string, x: Range, z: Range, top: number, height: number, slope = 0) => {
  const angle = -Math.atan(slope)
  return {
    name,
    position: [(x[0] + x[1]) / 2, top + slope * (z[1] - z[0]) / 2 - height / 2 * Math.cos(angle), (z[0] + z[1]) / 2 - height / 2 * Math.sin(angle)] as Vec3,
    rotation: [angle, 0, 0] as Vec3,
    size: [Math.abs(x[1] - x[0]), height, Math.hypot(z[1] - z[0], slope * (z[1] - z[0]))] as Vec3,
  }
}
const tunnelDisplays = (['west', 'east'] as const).map((side, index) => {
  const direction = side === 'west' ? -1 : 1
  const frontX = tunnel.x + direction * tunnel.width / 2
  const backX = frontX + direction * depth
  const centerX = (frontX + backX) / 2
  const {headroom, going, rise, width: stairWidth} = displayStairway
  const id = `${side}-display`
  const innerX = oculus.center[0] + direction * oculus.size[0] / 2
  const outsideX = backX + direction * thickness
  // The lower flight takes as many whole steps as it needs to reach in from past the upper flight’s steps and the least floor behind the door, and that floor takes up what they leave of the way out.
  const upperCount = displayStairway.upperSteps
  const lowerCount = Math.ceil((Math.abs(innerX - outsideX) + wallFace + displayStairway.threshold + upperCount * going) / going - 1e-9)
  /** where the upper flight meets the middle one, along whose inner wall */
  const turnX = outsideX + direction * lowerCount * going
  const outerX = turnX + direction * stairWidth
  const middleX = (turnX + outerX) / 2
  const upperZ: Range = [doorZ - stairWidth / 2, doorZ + stairWidth / 2]
  // The lower flight’s north wall continues the display’s south end wall’s outer face, and its south wall backs Moonfall’s north wall.
  const lowerZ: Range = [tunnel.southZ - stairWidth, tunnel.southZ]
  const lowerCenterZ = (lowerZ[0] + lowerZ[1]) / 2
  const landingY = tunnelFloorHeight(southZ)
  /** the level floor behind the door */
  const threshold = Math.abs(turnX - innerX) - upperCount * going
  // Every flight ends a step over the floor below, so it has a step more than treads. The drop takes as many whole steps as fit, and the ramp south of the upper corner falls by what they leave of it. The middle flight runs straight down from the ramp into the lower corner, and the ramp fills what its steps leave of the way south.
  const steps = Math.floor((balconyY - landingY) / rise + 1e-9)
  const middleCount = steps - upperCount - lowerCount - 3
  /** where the middle flight leaves the ramp at its foot */
  const rampZ = lowerZ[0] - middleCount * going
  const cornerY = balconyY - (upperCount + 1) * rise
  const lowerCornerY = landingY + (lowerCount + 1) * rise
  const rampY = lowerCornerY + (middleCount + 1) * rise
  const rampSlope = (rampY - cornerY) / (rampZ - upperZ[1])
  const flights = [
    new StairFlight(`${id}-upper`, [innerX, balconyY, doorZ], [turnX, cornerY + rise, doorZ], stairWidth, upperCount, threshold, 0, 'exhibition', headroom),
    new StairFlight(`${id}-middle`, [middleX, rampY, rampZ], [middleX, lowerCornerY + rise, lowerZ[0]], stairWidth, middleCount, 0, 0, 'exhibition', headroom),
    new StairFlight(`${id}-lower`, [turnX, lowerCornerY, lowerCenterZ], [outsideX, landingY + rise, lowerCenterZ], stairWidth, lowerCount, 0, 0, 'exhibition', headroom),
  ] as const
  const corners: [DisplayLevel, DisplayLevel] = [
    {
      ...area([turnX, outerX], upperZ),
      floor: cornerY,
      headroom,
    },
    {
      ...area([turnX, outerX], lowerZ),
      floor: lowerCornerY,
      headroom,
    },
  ]
  /** south of the upper corner, down to the middle flight */
  const ramp: DisplayLevel = {
    ...area([turnX, outerX], [upperZ[1], rampZ]),
    floor: cornerY,
    headroom,
    slope: rampSlope,
  }
  const door: Vec3 = [innerX, balconyY, doorZ]
  const cutout = {
    /** its jamb by the tunnel, in line with the landing’s wall */
    from: backX - direction * displayStairway.cutoutWidth,
    /** its jamb at the display’s back wall */
    to: backX,
    /** where the display’s ceiling, which reaches over the south end wall, meets the landing’s at the wall’s outer face */
    top: tunnelFloorHeight(southZ + thickness) + tunnel.height,
  }
  /** where the landing’s wall by the tunnel stands, its face in line with the cutout’s jamb */
  const landingX = cutout.from - direction * wallFace
  /** outside the cutout, level with the display’s floor at its south end, from its wall by the tunnel to the lower flight, and as high as the display, so the cutout runs up to the display’s ceiling */
  const landing: DisplayLevel = {
    ...area([landingX, outsideX], [southZ, tunnel.southZ]),
    floor: landingY,
    headroom: cutout.top + ceilingThickness / 2 - landingY,
  }
  /** under the landing’s ceiling, which starts at the south end wall’s outer face */
  const landingCeilingZ: Range = [southZ + thickness, tunnel.southZ]
  const innerFace = passageOrientation(2, -direction)
  const outerFace = passageOrientation(2, direction)
  const stairWall = (name: string, wall: Pick<Wall, 'center' | 'rotation' | 'width'>, wallHeadroom = headroom): Wall => ({
    ...wall,
    id: `exhibition-stairs_${id.replaceAll('-', '_')}_${name.replaceAll('-', '_')}`,
    room: 'exhibition',
    height: wallHeadroom - 0.3,
    sticky: false,
    trimStyle: 'plain',
  })
  const flightWall = (flight: StairFlight, cross: number): Wall => ({
    ...flight.wall(cross),
    trimStyle: 'plain',
  })
  /** The wall along X, reaching on past its end at `x` by a wall’s thickness to close the corner behind the middle flights’ inner wall. */
  const closingCorner = (wall: Wall, x: number): Wall => {
    const shift = Math.sign(x - wall.center[0]) * wallFace / 2
    return {
      ...wall,
      center: [wall.center[0] + shift, wall.center[1] + (wall.slope ?? 0) * shift * Math.cos(wall.rotation), wall.center[2]],
      width: wall.width + wallFace,
    }
  }
  /** the ramp’s wall at `x`, falling with it */
  const rampWall = (face: typeof innerFace, x: number): Wall => ({
    ...stairWall(`ramp-${face.name}`, {
      center: [x, levelFloor(ramp, ramp.center[1]), ramp.center[1]],
      rotation: face.rotation,
      width: ramp.size[1],
    }),
    // along its width, which runs north on a wall facing +x
    slope: -rampSlope * Math.sin(face.rotation),
  })
  const upperBottom = flights[0].end[1] - stairThickness
  /** the upper flight’s wall on the side, level under its level ceiling, from below its lowest tread up to the door’s headroom */
  const upperWall = (cross: number): Wall => {
    const face = passageOrientation(0, cross)
    return stairWall(`upper-${face.name}`, {
      center: [(innerX + turnX) / 2, upperBottom, doorZ + cross * stairWidth / 2],
      rotation: face.rotation,
      width: Math.abs(turnX - innerX),
    }, balconyY + headroom - upperBottom)
  }
  const entry = stairWall('entry', {
    center: [innerX, balconyY, doorZ],
    rotation: innerFace.rotation,
    width: stairWidth,
  })
  const walls: Array<Wall> = [
    {
      ...entry,
      holes: [
        {
          u: wallCoordinates(entry, door),
          width: displayStairway.doorWidth,
          height: displayStairway.doorHeight,
          profile: 'rectangle',
        },
      ],
    },
    upperWall(-1),
    closingCorner(upperWall(1), turnX),
    stairWall(`corner-${outerFace.name}`, {
      center: [outerX, cornerY, doorZ],
      rotation: outerFace.rotation,
      width: stairWidth,
    }),
    // They run from the upper flight’s south wall to the middle flight.
    rampWall(innerFace, turnX),
    rampWall(outerFace, outerX),
    stairWall('corner-north', {
      center: [middleX, cornerY, upperZ[0]],
      rotation: 0,
      width: stairWidth,
    }),
    ...[-1, 1].map(cross => flightWall(flights[1], cross)),
    stairWall(`lower-corner-${outerFace.name}`, {
      center: [outerX, lowerCornerY, lowerCenterZ],
      rotation: outerFace.rotation,
      width: stairWidth,
    }),
    stairWall('lower-corner-south', {
      center: [middleX, lowerCornerY, tunnel.southZ],
      rotation: Math.PI,
      width: stairWidth,
    }),
    closingCorner(flightWall(flights[2], -1), turnX),
    flightWall(flights[2], 1),
    // It runs from the display’s south end wall on.
    stairWall(`landing-${innerFace.name}`, {
      center: [landingX, landingY, (landingCeilingZ[0] + landingCeilingZ[1]) / 2],
      rotation: innerFace.rotation,
      width: landingCeilingZ[1] - landingCeilingZ[0],
    }, landing.headroom),
    stairWall('landing-south', {
      center: [landing.center[0], landingY, tunnel.southZ],
      rotation: Math.PI,
      width: landing.size[0],
    }, landing.headroom),
  ]
  const southEndZ = southZ + thickness / 2
  const southEnd = (fromX: number, toX: number): DisplayBox => ({
    position: [(fromX + toX) / 2, tunnelFloorHeight(southEndZ) + tunnel.height / 2, southEndZ],
    size: [Math.abs(toX - fromX), tunnel.height, thickness],
  })
  const shell: Array<DisplayBox> = [
    {
      position: [centerX, floorY - thickness / 2, centerZ],
      size: [depth, thickness, width],
    },
    // The ceiling reaches over the south end wall, sloping with the display, so the cutout runs up to it and it meets the landing’s level ceiling at the wall’s outer face.
    {
      position: [centerX, tunnelFloorHeight(centerZ + thickness / 2) + tunnel.height + thickness / 2, centerZ + thickness / 2],
      size: [depth, thickness, width + thickness],
    },
    // The back wall reaches past the south end wall, as the cutout’s jamb, to close the corner beside the landing.
    {
      position: [backX + direction * thickness / 2, tunnelFloorHeight(centerZ + thickness / 2) + tunnel.height / 2, centerZ + thickness / 2],
      size: [thickness, tunnel.height, width + thickness],
    },
    {
      position: [centerX, tunnelFloorHeight(northZ - thickness / 2) + tunnel.height / 2, northZ - thickness / 2],
      size: [depth, tunnel.height, thickness],
    },
    southEnd(frontX, cutout.from),
  ]
  const ceilingY = (level: DisplayLevel) => level.floor + level.headroom + ceilingThickness / 2
  /** under the level’s ceiling at `z` */
  const lamp = (level: DisplayLevel, x: number, z: number): Vec3 => [x, levelFloor(level, z) + level.headroom - ceilingThickness / 2, z]
  const footZ = rampZ - stairWidth / 2
  /** under the ceilings: behind the door, in the upper corner, down the ramp in thirds to its foot, in the lower corner and over the landing */
  const lamps: Array<Vec3> = [
    [innerX + direction * (wallFace + 0.5), balconyY + headroom - ceilingThickness / 2, doorZ],
    lamp(corners[0], middleX, doorZ),
    ...[1, 2, 3].map(third => lamp(ramp, middleX, doorZ + third * (footZ - doorZ) / 3)),
    lamp(corners[1], middleX, lowerCenterZ),
    lamp(landing, landing.center[0], (landingCeilingZ[0] + landingCeilingZ[1]) / 2),
  ]
  const ranges = ({center, size}: FloorRectangle): [Range, Range] => [[center[0] - size[0] / 2, center[0] + size[0] / 2], [center[1] - size[1] / 2, center[1] + size[1] / 2]]
  return {
    side,
    frontX,
    backX,
    center: [centerX, centerZ] as const,
    size: [depth, width] as const,
    shell,
    exhibits: [-1, 0, 1].map((slot, i) => ({
      id: `tunnel-${side}-exhibit-${i}`,
      kind: (index * 3 + i) as 0 | 1 | 2 | 3 | 4 | 5,
      position: [centerX, tunnelFloorHeight(centerZ + slot * width / 3), centerZ + slot * width / 3] as Vec3,
    })),
    stairway: {
      id,
      /** the middle of the door’s threshold in the Oculus’ side wall */
      door,
      cutout,
      /** from the door out, then south, then back in to the landing */
      flights,
      treads: flights.flatMap(flight => flight.blocks),
      corners,
      ramp,
      landing,
      walls,
      /** the floors and their ceilings; the ceilings reach under the flights’ to close the joints */
      slabs: [
        ...[...corners, ramp].map(level => slab('display-stairway-floor', ...ranges(level), level.floor, oculusBalcony.size[1], level.slope)),
        slab('display-landing-floor', ...ranges(landing), landingY, oculusBalcony.size[1]),
        // The upper flight’s ceiling hangs level at the door’s headroom, leaving room for the lamp behind the door, and steps down to the corner’s.
        slab('display-stairway-ceiling', [innerX, turnX], upperZ, balconyY + headroom + ceilingThickness / 2, ceilingThickness),
        slab('display-stairway-header', [turnX, turnX + direction * thickness], upperZ, balconyY + headroom + ceilingThickness / 2, balconyY - cornerY),
        slab('display-stairway-ceiling', [turnX, outerX], upperZ, ceilingY(corners[0]), ceilingThickness),
        slab('display-stairway-ceiling', [turnX, outerX], [upperZ[1], rampZ + 0.1], ceilingY(ramp), ceilingThickness, rampSlope),
        slab('display-stairway-ceiling', [turnX - direction * 0.1, outerX], [lowerZ[0] - 0.1, lowerZ[1]], ceilingY(corners[1]), ceilingThickness),
        slab('display-landing-ceiling', [landingX, outsideX], landingCeilingZ, ceilingY(landing), ceilingThickness),
        // It closes the step up from the lower flight’s roof to the landing’s ceiling.
        slab('display-landing-header', [outsideX, outsideX + direction * thickness], lowerZ, ceilingY(landing), ceilingY(landing) - flights[2].end[1] - headroom + ceilingThickness / 2),
      ],
      /** the sloping ceilings of the middle and the lower flight; the upper one’s is level */
      roofs: flights.slice(1).map(flight => flight.beam(headroom, ceilingThickness, flight.width)) satisfies Array<StairBeam>,
      lamps,
      /** the air of the upper flight with its corner, of the middle flight with the ramp before it, of the lower flight with its corner and the landing, and of the display, each from its lowest floor up to its highest ceiling */
      air: [
        air([innerX, outerX], upperZ, cornerY, balconyY + headroom),
        air([turnX, outerX], [upperZ[1], lowerZ[0]], lowerCornerY, cornerY + headroom),
        air([landingX, outerX], [southZ, tunnel.southZ], landingY, Math.max(lowerCornerY + headroom, landingY + landing.headroom)),
        {
          center: [centerX, centerZ],
          size: [depth, width],
          bottom: tunnelFloorHeight(northZ),
          top: tunnelFloorHeight(southZ) + tunnel.height,
        },
      ] satisfies Array<DisplayAir>,
    },
  }
})
const inside = (x: number, z: number, {center, size}: Record<'center' | 'size', readonly [number, number]>) => Math.abs(x - center[0]) <= size[0] / 2 + 1e-6 && Math.abs(z - center[1]) <= size[1] / 2 + 1e-6
export function displayFloorHeight(x: number, z: number) {
  return displayGround(x, z)?.floor
}

/** Whether the position lies in a display or on its stairway down from the Oculus balcony. */
export function insideTunnelDisplay([x, y, z]: Vec3) {
  const ground = displayGround(x, z)
  return ground !== undefined && y >= ground.floor - 1 && y <= ground.floor + ground.headroom
}

/** The floor under the point in a display, on the steps of its stairway or on one of its floors, with the headroom over it, or undefined elsewhere. */
function displayGround(x: number, z: number) {
  for (const display of tunnelDisplays) {
    const {stairway} = display
    const tread = stairway.treads.find(block => Math.abs(x - block.position[0]) <= block.size[0] / 2 + 1e-6 && Math.abs(z - block.position[2]) <= block.size[2] / 2 + 1e-6)
    if (tread) {
      return {
        floor: tread.top,
        headroom: displayStairway.headroom,
      }
    }
    const level = [...stairway.corners, stairway.ramp, stairway.landing].find(value => inside(x, z, value))
    if (level) {
      return {
        floor: levelFloor(level, z),
        headroom: level.headroom,
      }
    }
    if (inside(x, z, display)) {
      return {
        floor: tunnelFloorHeight(z),
        headroom: tunnel.height,
      }
    }
  }
}

export default tunnelDisplays

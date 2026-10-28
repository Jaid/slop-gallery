import type {FloorRectangle} from './floors.ts'
import type {StairBeam} from './stairs/StairFlight.ts'
import type {Vec3} from './types.ts'
import type {Wall} from './walls.ts'

import {wallCoordinates} from '../placement/wallGeometry.ts'
import {wallFace} from './architectureDimensions.ts'
import lowerGallery, {tunnelFloorHeight, tunnelSlope} from './lowerGallery.ts'
import oculusBalcony from './oculusBalcony.ts'
import passageOrientation from './passages/orientation.ts'
import StairFlight from './stairs/StairFlight.ts'

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
/** A staff stairway runs down behind each display, from a door in the Oculus’ side wall at the balcony’s end out, then south and back in to a landing before a cutout in the display’s south end wall, turning on flat squares. */
export const displayStairway = {
  /** between the outsides of its walls, which stand inside it; the lower flight fills the gap between the display’s south end wall and Moonfall’s north wall */
  width: tunnel.southZ - (southZ + thickness - wallFace),
  /** over the grade, where its ceiling hangs, still below the floors of the Dine and the Salon above */
  headroom: 2.8,
  /** about how deep each step is, which sets how many steps each flight takes; all of them share the drop evenly */
  going: 0.5,
  /** the level floor behind the door, in front of its casing, before the first step down */
  threshold: 0.4,
  /** how far out from the Oculus’ side wall the upper flight runs before the middle ones turn south */
  reach: 3.75,
  /** the level floor between the two middle flights, which keeps the long run from flattening every step */
  rest: 3,
  /** narrow enough for the door’s casing to fit on the balcony, between the south wall and the balcony’s edge */
  doorWidth: 1.8,
  /** low enough for the door’s casing to stay below the cornice of the Oculus’ side wall */
  doorHeight: 2.1,
  /** the cutout in the display’s south end wall, from the landing’s wall by the tunnel */
  cutoutWidth: 2.2,
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
/** a flat floor of the stairway, at the height of `floor` */
type DisplayLevel = FloorRectangle & {floor: number}
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
/** a level slab over the ranges, with its top at `top` */
const slab = (name: string, x: Range, z: Range, top: number, height: number) => ({
  name,
  position: [(x[0] + x[1]) / 2, top - height / 2, (z[0] + z[1]) / 2] as Vec3,
  size: [Math.abs(x[1] - x[0]), height, Math.abs(z[1] - z[0])] as Vec3,
})
const tunnelDisplays = (['west', 'east'] as const).map((side, index) => {
  const direction = side === 'west' ? -1 : 1
  const frontX = tunnel.x + direction * tunnel.width / 2
  const backX = frontX + direction * depth
  const centerX = (frontX + backX) / 2
  const {headroom, going, width: stairWidth} = displayStairway
  const id = `${side}-display`
  const innerX = oculus.center[0] + direction * oculus.size[0] / 2
  /** where the upper flight meets the middle ones, along whose inner wall */
  const turnX = innerX + direction * displayStairway.reach
  const outerX = turnX + direction * stairWidth
  const middleX = (turnX + outerX) / 2
  const outsideX = backX + direction * thickness
  const upperZ: Range = [doorZ - stairWidth / 2, doorZ + stairWidth / 2]
  // The lower flight’s north wall continues the display’s south end wall’s outer face, and its south wall backs Moonfall’s north wall.
  const lowerZ: Range = [tunnel.southZ - stairWidth, tunnel.southZ]
  const lowerCenterZ = (lowerZ[0] + lowerZ[1]) / 2
  const restZ: Range = [(upperZ[1] + lowerZ[0] - displayStairway.rest) / 2, (upperZ[1] + lowerZ[0] + displayStairway.rest) / 2]
  const landingY = tunnelFloorHeight(southZ)
  const threshold = wallFace + displayStairway.threshold
  // Every flight ends a step over the floor below, so it has a step more than treads, and all steps rise alike from the landing up to the balcony.
  const counts = [Math.abs(turnX - innerX) - threshold, restZ[0] - upperZ[1], lowerZ[0] - restZ[1], Math.abs(turnX - outsideX)].map(run => Math.round(run / going))
  const steps = (flightCount: number) => counts.slice(0, flightCount).reduce((sum, count) => sum + count + 1, 0)
  const rise = (balconyY - landingY) / steps(counts.length)
  const [cornerY, restY, lowerCornerY] = [1, 2, 3].map(flightCount => balconyY - steps(flightCount) * rise)
  const flights = [
    new StairFlight(`${id}-upper`, [innerX, balconyY, doorZ], [turnX, cornerY + rise, doorZ], stairWidth, counts[0], threshold, 0, 'oculus', headroom),
    new StairFlight(`${id}-middle`, [middleX, cornerY, upperZ[1]], [middleX, restY + rise, restZ[0]], stairWidth, counts[1], 0, 0, 'oculus', headroom),
    new StairFlight(`${id}-middle-lower`, [middleX, restY, restZ[1]], [middleX, lowerCornerY + rise, lowerZ[0]], stairWidth, counts[2], 0, 0, 'oculus', headroom),
    new StairFlight(`${id}-lower`, [turnX, lowerCornerY, lowerCenterZ], [outsideX, landingY + rise, lowerCenterZ], stairWidth, counts[3], 0, 0, 'oculus', headroom),
  ] as const
  const corners: [DisplayLevel, DisplayLevel] = [
    {
      ...area([turnX, outerX], upperZ),
      floor: cornerY,
    },
    {
      ...area([turnX, outerX], lowerZ),
      floor: lowerCornerY,
    },
  ]
  const rest: DisplayLevel = {
    ...area([turnX, outerX], restZ),
    floor: restY,
  }
  /** outside the cutout, level with the display’s floor at its south end, from the cutout’s threshold to the lower flight */
  const landing: DisplayLevel = {
    ...area([frontX, outsideX], [southZ, tunnel.southZ]),
    floor: landingY,
  }
  /** under the landing’s ceiling, which starts at the south end wall’s outer face */
  const landingCeilingZ: Range = [southZ + thickness, tunnel.southZ]
  const door: Vec3 = [innerX, balconyY, doorZ]
  const cutout = {
    /** its jamb by the tunnel, in line with the landing’s wall */
    from: frontX + direction * wallFace,
    to: frontX + direction * (wallFace + displayStairway.cutoutWidth),
    /** the underside of the landing’s ceiling */
    top: landingY + headroom - ceilingThickness / 2,
  }
  const innerFace = passageOrientation(2, -direction)
  const outerFace = passageOrientation(2, direction)
  const stairWall = (name: string, wall: Pick<Wall, 'center' | 'rotation' | 'width'>): Wall => ({
    ...wall,
    id: `oculus-stairs-${id}-${name}`,
    room: 'oculus',
    height: headroom - 0.3,
    hangable: false,
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
      center: [wall.center[0] + shift, wall.center[1] + wall.slope! * shift * Math.cos(wall.rotation), wall.center[2]],
      width: wall.width + wallFace,
    }
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
    flightWall(flights[0], -1),
    closingCorner(flightWall(flights[0], 1), turnX),
    stairWall(`corner-${outerFace.name}`, {
      center: [outerX, cornerY, doorZ],
      rotation: outerFace.rotation,
      width: stairWidth,
    }),
    stairWall('corner-north', {
      center: [middleX, cornerY, upperZ[0]],
      rotation: 0,
      width: stairWidth,
    }),
    ...[flights[1], flights[2]].flatMap(flight => [-1, 1].map(cross => flightWall(flight, cross))),
    ...[innerFace, outerFace].map(face => stairWall(`rest-${face.name}`, {
      center: [face === innerFace ? turnX : outerX, restY, rest.center[1]],
      rotation: face.rotation,
      width: rest.size[1],
    })),
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
    closingCorner(flightWall(flights[3], -1), turnX),
    flightWall(flights[3], 1),
    // It backs the tunnel’s wall, from the display’s south end wall on.
    stairWall(`landing-${innerFace.name}`, {
      center: [frontX, landingY, (landingCeilingZ[0] + landingCeilingZ[1]) / 2],
      rotation: innerFace.rotation,
      width: landingCeilingZ[1] - landingCeilingZ[0],
    }),
    stairWall('landing-south', {
      center: [landing.center[0], landingY, tunnel.southZ],
      rotation: Math.PI,
      width: landing.size[0],
    }),
  ]
  const southEndZ = southZ + thickness / 2
  const southEnd = (fromX: number, toX: number): DisplayBox => ({
    position: [(fromX + toX) / 2, tunnelFloorHeight(southEndZ) + tunnel.height / 2, southEndZ],
    size: [Math.abs(toX - fromX), tunnel.height, thickness],
  })
  // The lintel slopes with the display, so it meets the landing’s level ceiling at its outer face.
  const lintelBottom = cutout.top - tunnelSlope * thickness / 2
  const lintelTop = tunnelFloorHeight(southEndZ) + tunnel.height
  const shell: Array<DisplayBox> = [
    {
      position: [centerX, floorY - thickness / 2, centerZ],
      size: [depth, thickness, width],
    },
    {
      position: [centerX, floorY + tunnel.height + thickness / 2, centerZ],
      size: [depth, thickness, width],
    },
    // The back wall reaches past the south end wall to close the corner beside the landing.
    {
      position: [backX + direction * thickness / 2, tunnelFloorHeight(centerZ + thickness / 2) + tunnel.height / 2, centerZ + thickness / 2],
      size: [thickness, tunnel.height, width + thickness],
    },
    {
      position: [centerX, tunnelFloorHeight(northZ - thickness / 2) + tunnel.height / 2, northZ - thickness / 2],
      size: [depth, tunnel.height, thickness],
    },
    southEnd(frontX, cutout.from),
    southEnd(cutout.to, backX),
    {
      position: [(cutout.from + cutout.to) / 2, (lintelBottom + lintelTop) / 2, southEndZ],
      size: [displayStairway.cutoutWidth, lintelTop - lintelBottom, thickness],
    },
  ]
  const ceilingY = (level: DisplayLevel) => level.floor + headroom + ceilingThickness / 2
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
      /** from the door out, then south in two parts, then back in to the landing */
      flights,
      treads: flights.flatMap(flight => flight.blocks),
      corners,
      rest,
      landing,
      walls,
      /** the flat floors and their ceilings; the ceilings reach under the flights’ to close the joints */
      slabs: [
        ...[...corners, rest].map(level => slab('display-stairway-floor', ...ranges(level), level.floor, oculusBalcony.size[1])),
        slab('display-landing-floor', ...ranges(landing), landingY, oculusBalcony.size[1]),
        slab('display-stairway-ceiling', [turnX - direction * 0.1, outerX], [upperZ[0], upperZ[1] + 0.1], ceilingY(corners[0]), ceilingThickness),
        slab('display-stairway-ceiling', [turnX - direction * 0.1, outerX], [lowerZ[0] - 0.1, lowerZ[1]], ceilingY(corners[1]), ceilingThickness),
        slab('display-stairway-ceiling', [turnX, outerX], [restZ[0] - 0.1, restZ[1] + 0.1], ceilingY(rest), ceilingThickness),
        slab('display-landing-ceiling', [frontX, outsideX + direction * 0.1], landingCeilingZ, ceilingY(landing), ceilingThickness),
      ],
      roofs: flights.map(flight => flight.beam(headroom, ceilingThickness, flight.width)) satisfies Array<StairBeam>,
      /** under the ceilings of the flat floors */
      lamps: [
        ...[...corners, rest].map(({center, floor}): Vec3 => [center[0], floor + headroom - ceilingThickness / 2, center[1]]),
        [landing.center[0], landingY + headroom - ceilingThickness / 2, (landingCeilingZ[0] + landingCeilingZ[1]) / 2] as Vec3,
      ],
      /** the air of the upper flight with its corner, of the middle flights, of the lower flight with its corner and the landing, and of the display, each from its lowest floor up to its highest ceiling */
      air: [
        air([innerX, outerX], upperZ, cornerY, balconyY + headroom),
        air([turnX, outerX], [upperZ[1], lowerZ[0]], lowerCornerY, cornerY + headroom),
        air([frontX, outerX], [southZ, tunnel.southZ], landingY, lowerCornerY + headroom),
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

/** The floor under the point in a display, on the steps of its stairway or on one of its flat floors, with the headroom over it, or undefined elsewhere. */
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
    const level = [...stairway.corners, stairway.rest, stairway.landing].find(value => inside(x, z, value))
    if (level) {
      return {
        floor: level.floor,
        headroom: displayStairway.headroom,
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

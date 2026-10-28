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
/** A staff stairway runs down behind each display, from a door in the Oculus’ side wall at the balcony’s end out, then south and back in to a landing before a cutout in the display’s south end wall. It turns on flat floors, the upper one running on south up to the middle flight. */
export const displayStairway = {
  /** between the outsides of its walls, which stand inside it; the lower flight fills the gap between the display’s south end wall and Moonfall’s north wall */
  width: tunnel.southZ - (southZ + thickness - wallFace),
  /** over the grade, where its ceiling hangs, still below the floors of the Dine and the Salon above */
  headroom: 2.8,
  /** about how deep each step is, which sets how many steps the upper and the lower flight take */
  going: 0.5,
  /** about how high each step rises, which sets how many steps the drop takes; all of them share it evenly, and the middle flight takes those the upper and the lower flight leave */
  rise: 0.125,
  /** the level floor behind the door, in front of its casing, before the first step down */
  threshold: 0.4,
  /** how far out from the Oculus’ side wall the upper flight runs before the middle one turns south */
  reach: 2.8,
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
  /** where the upper flight meets the middle one, along whose inner wall */
  const turnX = innerX + direction * displayStairway.reach
  const outerX = turnX + direction * stairWidth
  const middleX = (turnX + outerX) / 2
  const outsideX = backX + direction * thickness
  const upperZ: Range = [doorZ - stairWidth / 2, doorZ + stairWidth / 2]
  // The lower flight’s north wall continues the display’s south end wall’s outer face, and its south wall backs Moonfall’s north wall.
  const lowerZ: Range = [tunnel.southZ - stairWidth, tunnel.southZ]
  const lowerCenterZ = (lowerZ[0] + lowerZ[1]) / 2
  const landingY = tunnelFloorHeight(southZ)
  const threshold = wallFace + displayStairway.threshold
  // Every flight ends a step over the floor below, so it has a step more than treads, and all steps rise alike from the landing up to the balcony. The middle flight runs straight down into the lower corner, and the flat floor before it fills what its steps leave of the way south.
  const steps = Math.round((balconyY - landingY) / displayStairway.rise)
  const rise = (balconyY - landingY) / steps
  const [upperCount, lowerCount] = [Math.abs(turnX - innerX) - threshold, Math.abs(turnX - outsideX)].map(run => Math.round(run / going))
  const middleCount = steps - upperCount - lowerCount - 3
  /** where the middle flight leaves the flat floor at its top */
  const flatZ = lowerZ[0] - middleCount * going
  const cornerY = balconyY - (upperCount + 1) * rise
  const lowerCornerY = cornerY - (middleCount + 1) * rise
  const flights = [
    new StairFlight(`${id}-upper`, [innerX, balconyY, doorZ], [turnX, cornerY + rise, doorZ], stairWidth, upperCount, threshold, 0, 'oculus', headroom),
    new StairFlight(`${id}-middle`, [middleX, cornerY, flatZ], [middleX, lowerCornerY + rise, lowerZ[0]], stairWidth, middleCount, 0, 0, 'oculus', headroom),
    new StairFlight(`${id}-lower`, [turnX, lowerCornerY, lowerCenterZ], [outsideX, landingY + rise, lowerCenterZ], stairWidth, lowerCount, 0, 0, 'oculus', headroom),
  ] as const
  const corners: [DisplayLevel, DisplayLevel] = [
    // The upper corner runs on south as the flat floor at the top of the middle flight.
    {
      ...area([turnX, outerX], [upperZ[0], flatZ]),
      floor: cornerY,
    },
    {
      ...area([turnX, outerX], lowerZ),
      floor: lowerCornerY,
    },
  ]
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
      center: [outerX, cornerY, corners[0].center[1]],
      rotation: outerFace.rotation,
      width: corners[0].size[1],
    }),
    // It runs from the upper flight’s south wall to the middle flight.
    stairWall(`corner-${innerFace.name}`, {
      center: [turnX, cornerY, (upperZ[1] + flatZ) / 2],
      rotation: innerFace.rotation,
      width: flatZ - upperZ[1],
    }),
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
  const lampY = (level: DisplayLevel) => level.floor + headroom - ceilingThickness / 2
  /** under the ceilings of the flat floors: in the upper corner, at the far end of the flat floor south of it, in the lower corner and over the landing */
  const lamps: Array<Vec3> = [
    [middleX, lampY(corners[0]), doorZ],
    [middleX, lampY(corners[0]), flatZ - stairWidth / 2],
    [middleX, lampY(corners[1]), lowerCenterZ],
    [landing.center[0], lampY(landing), (landingCeilingZ[0] + landingCeilingZ[1]) / 2],
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
      landing,
      walls,
      /** the flat floors and their ceilings; the ceilings reach under the flights’ to close the joints */
      slabs: [
        ...corners.map(level => slab('display-stairway-floor', ...ranges(level), level.floor, oculusBalcony.size[1])),
        slab('display-landing-floor', ...ranges(landing), landingY, oculusBalcony.size[1]),
        slab('display-stairway-ceiling', [turnX - direction * 0.1, outerX], upperZ, ceilingY(corners[0]), ceilingThickness),
        slab('display-stairway-ceiling', [turnX, outerX], [upperZ[1], flatZ + 0.1], ceilingY(corners[0]), ceilingThickness),
        slab('display-stairway-ceiling', [turnX - direction * 0.1, outerX], [lowerZ[0] - 0.1, lowerZ[1]], ceilingY(corners[1]), ceilingThickness),
        slab('display-landing-ceiling', [frontX, outsideX + direction * 0.1], landingCeilingZ, ceilingY(landing), ceilingThickness),
      ],
      roofs: flights.map(flight => flight.beam(headroom, ceilingThickness, flight.width)) satisfies Array<StairBeam>,
      lamps,
      /** the air of the upper flight with its corner, of the middle flight with the flat floor before it, of the lower flight with its corner and the landing, and of the display, each from its lowest floor up to its highest ceiling */
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
    const level = [...stairway.corners, stairway.landing].find(value => inside(x, z, value))
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

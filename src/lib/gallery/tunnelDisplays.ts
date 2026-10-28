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
/** A staff stairway runs down behind each display, from a door in the Oculus’ side wall at the balcony’s end, along the outside of the Oculus’ side wall, to a landing that opens the display’s south end. */
export const displayStairway = {
  /** between the outsides of its walls, which stand inside it */
  width: 2.4,
  /** over the grade, where its ceiling hangs, still below the floors of the Dine and the Salon above */
  headroom: 2.8,
  count: 30,
  /** narrow enough for the door’s casing to fit on the balcony, between the south wall and the balcony’s edge */
  doorWidth: 1.8,
  /** low enough for the door’s casing to stay below the cornice of the Oculus’ side wall */
  doorHeight: 2.1,
}
const centerZ = (tunnel.northZ + tunnel.southZ) / 2
const floorY = tunnelFloorHeight(centerZ)
const depth = 3.2
const thickness = 0.18
const ceilingThickness = 0.18
const balconyY = oculusBalcony.position[1] + oculusBalcony.size[1] / 2
const balconyNorthZ = oculusBalcony.position[2] - oculusBalcony.size[2] / 2
/** where the doors sit along the side walls, halfway between the south wall’s face and the balcony’s edge */
const doorZ = (tunnel.northZ - wallFace + balconyNorthZ) / 2
export type DisplayBox = {
  position: Vec3
  size: Vec3
}
type DisplayAir = FloorRectangle & Record<'bottom' | 'top', number>
const tunnelDisplays = (['west', 'east'] as const).map((side, index) => {
  const direction = side === 'west' ? -1 : 1
  const frontX = tunnel.x + direction * tunnel.width / 2
  const backX = frontX + direction * depth
  const centerX = (frontX + backX) / 2
  const width = tunnelDisplayWindow.width
  const northZ = centerZ - width / 2
  const southZ = centerZ + width / 2
  const {headroom} = displayStairway
  // The stairway runs along the outside of the Oculus’ side wall. Its walls stand inside its width, so its inner wall meets the Oculus’ back to back.
  const innerX = oculus.center[0] + direction * oculus.size[0] / 2
  const outerX = innerX + direction * displayStairway.width
  const stairX = (innerX + outerX) / 2
  const outsideX = backX + direction * thickness
  // The landing is as wide between its walls as the flight, and its north wall lines up with the end of the display’s back wall.
  const doorwayZ = southZ - displayStairway.width + wallFace
  /** level with the balcony behind the door, and as deep */
  const vestibule: FloorRectangle = {
    center: [stairX, (balconyNorthZ + tunnel.northZ) / 2],
    size: [displayStairway.width, tunnel.northZ - balconyNorthZ],
  }
  const flight = new StairFlight(`${side}-display`, [stairX, balconyY, tunnel.northZ], [stairX, tunnelFloorHeight(doorwayZ), doorwayZ], displayStairway.width, displayStairway.count, 0, 0, 'oculus', headroom)
  /** The landing continues the display’s sloping floor from the back wall’s doorway out to the stairway’s outer wall, up to its south wall, which lines up with the display’s end. */
  const landing: FloorRectangle = {
    center: [(backX + outerX) / 2, (doorwayZ + southZ + wallFace) / 2],
    size: [Math.abs(outerX - backX), southZ + wallFace - doorwayZ],
  }
  const landingY = tunnelFloorHeight(landing.center[1])
  const door: Vec3 = [innerX, balconyY, doorZ]
  const innerFace = passageOrientation(2, -direction)
  const outerFace = passageOrientation(2, direction)
  const stairWall = (name: string, wall: Pick<Wall, 'center' | 'rotation' | 'slope' | 'width'>): Wall => ({
    ...wall,
    id: `oculus-stairs-${flight.id}-${name}`,
    room: 'oculus',
    height: headroom - 0.3,
    hangable: false,
    trimStyle: 'plain',
  })
  const vestibuleInner = stairWall(`vestibule-${innerFace.name}`, {
    center: [innerX, balconyY, vestibule.center[1]],
    rotation: innerFace.rotation,
    width: vestibule.size[1],
  })
  const walls: Array<Wall> = [
    {
      ...vestibuleInner,
      holes: [
        {
          u: wallCoordinates(vestibuleInner, door),
          width: displayStairway.doorWidth,
          height: displayStairway.doorHeight,
          profile: 'rectangle',
        },
      ],
    },
    stairWall(`vestibule-${outerFace.name}`, {
      center: [outerX, balconyY, vestibule.center[1]],
      rotation: outerFace.rotation,
      width: vestibule.size[1],
    }),
    stairWall('vestibule-north', {
      center: [stairX, balconyY, balconyNorthZ],
      rotation: 0,
      width: displayStairway.width,
    }),
    ...[-1, 1].map(cross => ({
      ...flight.wall(cross),
      trimStyle: 'plain' as const,
    })),
    stairWall(`landing-${outerFace.name}`, {
      center: [outerX, landingY, landing.center[1]],
      rotation: outerFace.rotation,
      width: landing.size[1],
      slope: direction * tunnelSlope,
    }),
    // It reaches past the flight’s inner wall to close the corner behind it.
    stairWall('landing-north', {
      center: [(outsideX + innerX + direction * wallFace) / 2, tunnelFloorHeight(doorwayZ), doorwayZ],
      rotation: 0,
      width: Math.abs(innerX + direction * wallFace - outsideX),
    }),
    stairWall('landing-south', {
      center: [landing.center[0], tunnelFloorHeight(southZ), southZ + wallFace],
      rotation: Math.PI,
      width: landing.size[0],
    }),
  ]
  const shell: Array<DisplayBox> = [
    {
      position: [centerX, floorY - thickness / 2, centerZ],
      size: [depth, thickness, width],
    },
    {
      position: [centerX, floorY + tunnel.height + thickness / 2, centerZ],
      size: [depth, thickness, width],
    },
    // The back wall ends at the landing’s north wall and only spans its doorway above the landing’s ceiling.
    {
      position: [backX + direction * thickness / 2, tunnelFloorHeight((northZ + doorwayZ + wallFace) / 2) + tunnel.height / 2, (northZ + doorwayZ + wallFace) / 2],
      size: [thickness, tunnel.height, doorwayZ + wallFace - northZ],
    },
    {
      position: [backX + direction * thickness / 2, tunnelFloorHeight((doorwayZ + wallFace + southZ) / 2) + (headroom - ceilingThickness / 2 + tunnel.height) / 2, (doorwayZ + wallFace + southZ) / 2],
      size: [thickness, tunnel.height - headroom + ceilingThickness / 2, southZ - doorwayZ - wallFace],
    },
    ...[-1, 1].map(end => ({
      position: [centerX, tunnelFloorHeight(centerZ + end * (width + thickness) / 2) + tunnel.height / 2, centerZ + end * (width + thickness) / 2] as Vec3,
      size: [depth, tunnel.height, thickness] as Vec3,
    })),
  ]
  const landingCeiling: DisplayBox = {
    position: [(outsideX + outerX) / 2, landingY + headroom, landing.center[1]],
    size: [Math.abs(outerX - outsideX), ceilingThickness, landing.size[1]],
  }
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
      x: stairX,
      /** the middle of the door’s threshold in the Oculus’ side wall */
      door,
      vestibule,
      flight,
      landing,
      walls,
      /** the vestibule’s floor, as thick as the balcony’s, and its ceiling, which reaches under the flight’s to close the joint */
      vestibuleSlabs: [
        {
          position: [stairX, balconyY - oculusBalcony.size[1] / 2, vestibule.center[1]],
          size: [displayStairway.width, oculusBalcony.size[1], vestibule.size[1]],
        },
        {
          position: [stairX, balconyY + headroom, vestibule.center[1] + 0.05],
          size: [displayStairway.width, ceilingThickness, vestibule.size[1] + 0.1],
        },
      ] satisfies Array<DisplayBox>,
      /** the landing’s floor and ceiling, sloping like the display’s; the ceiling ends at the back wall’s line, whose span over the doorway goes down as far */
      floor: {
        position: [landing.center[0], landingY - thickness / 2, landing.center[1]],
        size: [landing.size[0], thickness, landing.size[1]],
      } satisfies DisplayBox,
      ceiling: landingCeiling,
      roof: flight.beam(headroom, ceilingThickness, flight.width) satisfies StairBeam,
      /** under the ceilings of the vestibule and the landing */
      lamps: [
        {
          position: [stairX, balconyY + headroom - ceilingThickness / 2, vestibule.center[1]] as Vec3,
          rotation: [0, 0, 0] as Vec3,
        },
        {
          position: [landingCeiling.position[0], landingCeiling.position[1] - ceilingThickness / 2, landingCeiling.position[2]] as Vec3,
          rotation: [-Math.atan(tunnelSlope), 0, 0] as Vec3,
        },
      ],
      /** the air of the vestibule with the flight, of the landing and of the display, each from its lowest floor up to its highest ceiling */
      air: [
        {
          center: [stairX, (balconyNorthZ + doorwayZ) / 2],
          size: [displayStairway.width, doorwayZ - balconyNorthZ],
          bottom: tunnelFloorHeight(doorwayZ),
          top: balconyY + headroom,
        },
        {
          center: landing.center,
          size: landing.size,
          bottom: tunnelFloorHeight(doorwayZ),
          top: tunnelFloorHeight(southZ + wallFace) + headroom,
        },
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

/** The floor under the point in a display, its landing, on the steps of its stairway or in its vestibule, with the headroom over it, or undefined elsewhere. */
function displayGround(x: number, z: number) {
  for (const display of tunnelDisplays) {
    const {stairway} = display
    if (inside(x, z, stairway.vestibule)) {
      return {
        floor: balconyY,
        headroom: displayStairway.headroom,
      }
    }
    const tread = stairway.flight.blocks.find(block => Math.abs(x - block.position[0]) <= block.size[0] / 2 + 1e-6 && Math.abs(z - block.position[2]) <= block.size[2] / 2 + 1e-6)
    if (tread) {
      return {
        floor: tread.top,
        headroom: displayStairway.headroom,
      }
    }
    if (inside(x, z, stairway.landing)) {
      return {
        floor: tunnelFloorHeight(z),
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

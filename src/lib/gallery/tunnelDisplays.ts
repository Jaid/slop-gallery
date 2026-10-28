import type {FloorRectangle} from './floors.ts'
import type {StairBeam} from './stairs/StairFlight.ts'
import type {Vec3} from './types.ts'
import type {Wall} from './walls.ts'

import {wallFace} from './architectureDimensions.ts'
import lowerGallery, {tunnelFloorHeight, tunnelSlope} from './lowerGallery.ts'
import oculusBalcony from './oculusBalcony.ts'
import passageOrientation from './passages/orientation.ts'
import StairFlight from './stairs/StairFlight.ts'

const {tunnel} = lowerGallery
export const tunnelDisplayWindow = {
  bottom: 0.55,
  top: 2.85,
  width: tunnel.southZ - tunnel.northZ - 4.5,
  glassThickness: 0.06,
}
/** A stairway runs down behind each display, from a door in the Oculus’ south wall beside the balcony’s end to a landing that opens the display’s south end. */
export const displayStairway = {
  /** between the outsides of its walls, which stand inside it */
  width: 2.4,
  /** over the grade, where its ceiling hangs, still below the Lobby’s floor at the balcony */
  headroom: 2.8,
  count: 30,
  /** the level start behind the door */
  entryLanding: 0.6,
  /** low enough for the door’s casing to stay below the cornice of the Oculus’ south wall */
  doorHeight: 2.1,
  /** the handrails’ height over the grade */
  railHeight: 1,
}
const centerZ = (tunnel.northZ + tunnel.southZ) / 2
const floorY = tunnelFloorHeight(centerZ)
const depth = 3.2
const thickness = 0.18
const ceilingThickness = 0.18
const balconyY = oculusBalcony.position[1] + oculusBalcony.size[1] / 2
export type DisplayBox = {
  position: Vec3
  size: Vec3
}
const tunnelDisplays = (['west', 'east'] as const).map((side, index) => {
  const direction = side === 'west' ? -1 : 1
  const frontX = tunnel.x + direction * tunnel.width / 2
  const backX = frontX + direction * depth
  const centerX = (frontX + backX) / 2
  const width = tunnelDisplayWindow.width
  const northZ = centerZ - width / 2
  const southZ = centerZ + width / 2
  const {headroom} = displayStairway
  // The stairway hugs the back wall’s outside. Its walls stand inside its width, so the landing opens as much of the back wall as lies between them.
  const outsideX = backX + direction * thickness
  const outerX = outsideX + direction * displayStairway.width
  const stairX = (outsideX + outerX) / 2
  const doorwayZ = southZ - (displayStairway.width - 2 * wallFace)
  const flight = new StairFlight(`${side}-display`, [stairX, balconyY, tunnel.northZ], [stairX, tunnelFloorHeight(doorwayZ), doorwayZ], displayStairway.width, displayStairway.count, displayStairway.entryLanding, 0, 'oculus', headroom)
  /** The landing continues the display’s sloping floor out to the stairway’s outer wall, from the back wall’s end to the landing’s own end wall, which lines up with the display’s. */
  const landing: FloorRectangle = {
    center: [(backX + outerX) / 2, (doorwayZ + southZ + wallFace) / 2],
    size: [Math.abs(outerX - backX), southZ + wallFace - doorwayZ],
  }
  const landingY = tunnelFloorHeight(landing.center[1])
  const outerFace = passageOrientation(2, direction)
  const walls: Array<Wall> = [
    ...[-1, 1].map(cross => ({
      ...flight.wall(cross),
      trimStyle: 'plain' as const,
    })),
    {
      id: `oculus-stairs-${flight.id}-landing-${outerFace.name}`,
      room: 'oculus',
      center: [outerX, landingY, landing.center[1]],
      rotation: outerFace.rotation,
      width: landing.size[1],
      height: headroom - 0.3,
      slope: direction * tunnelSlope,
      hangable: false,
      trimStyle: 'plain',
    },
    {
      id: `oculus-stairs-${flight.id}-landing-south`,
      room: 'oculus',
      center: [landing.center[0], tunnelFloorHeight(southZ), southZ + wallFace],
      rotation: Math.PI,
      width: landing.size[0],
      height: headroom - 0.3,
      hangable: false,
      trimStyle: 'plain',
    },
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
    // The back wall ends at the landing and only spans its doorway above the stairway’s ceiling.
    {
      position: [backX + direction * thickness / 2, tunnelFloorHeight((northZ + doorwayZ) / 2) + tunnel.height / 2, (northZ + doorwayZ) / 2],
      size: [thickness, tunnel.height, doorwayZ - northZ],
    },
    {
      position: [backX + direction * thickness / 2, tunnelFloorHeight((doorwayZ + southZ) / 2) + (headroom - ceilingThickness / 2 + tunnel.height) / 2, (doorwayZ + southZ) / 2],
      size: [thickness, tunnel.height - headroom + ceilingThickness / 2, southZ - doorwayZ],
    },
    ...[-1, 1].map(end => ({
      position: [centerX, tunnelFloorHeight(centerZ + end * (width + thickness) / 2) + tunnel.height / 2, centerZ + end * (width + thickness) / 2] as Vec3,
      size: [depth, tunnel.height, thickness] as Vec3,
    })),
  ]
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
      flight,
      landing,
      walls,
      /** the landing’s floor and ceiling, sloping like the display’s; the ceiling ends at the back wall’s line, whose span over the doorway goes down as far */
      floor: {
        position: [landing.center[0], landingY - thickness / 2, landing.center[1]],
        size: [landing.size[0], thickness, landing.size[1]],
      } satisfies DisplayBox,
      ceiling: {
        position: [(outsideX + outerX) / 2, landingY + headroom, landing.center[1]],
        size: [displayStairway.width, ceilingThickness, landing.size[1]],
      } satisfies DisplayBox,
      roof: flight.beam(headroom, ceilingThickness, flight.width) satisfies StairBeam,
      rails: [-1, 1].map(cross => flight.beam(displayStairway.railHeight, 0.065, 0.065, stairX + cross * (flight.width / 2 - 0.23))),
      /** the air of the stairway, its landing and the display, from the display’s low north end up to the ceiling behind the door */
      air: {
        center: [(frontX + outerX) / 2, (tunnel.northZ + southZ + wallFace) / 2],
        size: [Math.abs(outerX - frontX), southZ + wallFace - tunnel.northZ],
        bottom: tunnelFloorHeight(northZ),
        top: balconyY + headroom,
      } satisfies FloorRectangle & Record<'bottom' | 'top', number>,
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

/** The floor under the point in a display, its landing or on the steps of its stairway, with the headroom over it, or undefined elsewhere. */
function displayGround(x: number, z: number) {
  for (const display of tunnelDisplays) {
    const {stairway} = display
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

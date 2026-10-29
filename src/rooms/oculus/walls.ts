import type {RoomWall} from '../base/Room.ts'
import type {Vec3} from 'math'

import roomOrigins from '#src/lib/gallery/layout.ts'
import lodge from '#src/lib/gallery/lodge.ts'
import lowerGallery, {oculusPlatform, oculusRamps} from '#src/lib/gallery/lowerGallery.ts'
import tunnelDisplays, {displayStairway} from '#src/lib/gallery/tunnelDisplays.ts'
import {wallCoordinates} from '#src/lib/placement/wallGeometry.ts'

import {planWall} from '../lib/walls.ts'

const {oculus, tunnel} = lowerGallery
const [originX, originY, originZ] = roomOrigins.oculus
const height = oculus.ceiling.topY - oculus.ceiling.thickness - oculus.floorY - 0.3
const [, depth] = oculus.size
/** A side wall along the ramps, whose baseboard follows them up to the turning landing, with the door at the balcony’s level onto the staff stairway down to the tunnel’s display on that side. */
const sideWall = (side: 'east' | 'west'): RoomWall => {
  const ramp = oculusRamps.find(value => value.side === side)!
  const wall = planWall(oculus.size, side, height, {trimStyle: 'plain'})
  const {stairway: {door}} = tunnelDisplays.find(display => display.side === side)!
  const doorAt: Vec3 = [door[0] - originX, door[1] - originY, door[2] - originZ]
  return {
    ...wall,
    baseboardProfile: [
      [oculus.center[1] - depth / 2, ramp.floorY + ramp.rise - oculus.floorY],
      [ramp.startZ - ramp.run, ramp.floorY + ramp.rise - oculus.floorY],
      [ramp.startZ, ramp.floorY - oculus.floorY],
      [ramp.startZ + ramp.width, ramp.floorY - oculus.floorY],
      [ramp.startZ + ramp.width, 0],
      [oculus.center[1] + depth / 2, 0],
    ].map(([z, y]): [number, number] => [(z - oculus.center[1]) * (side === 'east' ? 1 : -1), y]).toSorted((a, b) => a[0] - b[0] || (side === 'east' ? b[1] - a[1] : a[1] - b[1])),
    holes: {
      staff_door: {
        u: wallCoordinates(wall, doorAt),
        width: displayStairway.doorWidth,
        bottom: doorAt[1],
        height: doorAt[1] + displayStairway.doorHeight,
        profile: 'rectangle',
      },
    },
  }
}
const platformHeight = oculusPlatform.position[1] + oculusPlatform.size[1] / 2 - oculus.floorY

export default {
  // Its baseboard runs along the platform’s top, past the arch into the Fortress.
  north: planWall(oculus.size, 'north', height, {
    trimStyle: 'plain',
    baseboardProfile: [[-oculus.size[0] / 2, platformHeight], [oculus.size[0] / 2, platformHeight]],
    holes: {
      fortress: {
        u: lodge.entranceX,
        bottom: lodge.floorY - oculus.floorY,
        width: lodge.passageWidth,
        height: lodge.floorY - oculus.floorY + 3.4,
        profile: 'arch',
      },
    },
  }),
  east: sideWall('east'),
  west: sideWall('west'),
  south: planWall(oculus.size, 'south', height, {
    trimStyle: 'plain',
    holes: {
      exhibition: {
        u: 0,
        width: tunnel.width,
        height: 3.6,
        profile: 'rectangle',
      },
    },
  }),
} satisfies Record<string, RoomWall>

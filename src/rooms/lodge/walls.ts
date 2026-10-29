import type {RoomWall} from '../base/Room.ts'

import lodge, {lodgeBay, lodgeWindow} from '#src/lib/gallery/lodge.ts'

import {planWall} from '../lib/walls.ts'

const height = lodge.height - 0.3
/** The bay’s walls, each from one of its corners to the next: the 45° walls out of the north-west and north-east room corners and the back wall between them. */
const [northwest, north, northeast] = [0, 1, 2].map((index): RoomWall => {
  const [fromX, fromZ] = lodgeBay.corners[index]
  const [toX, toZ] = lodgeBay.corners[index + 1]
  // A wall runs along its own +x, which turns toward −z as its rotation grows.
  return {
    center: [(fromX + toX) / 2 - lodge.center[0], 0, (fromZ + toZ) / 2 - lodge.center[1]],
    rotation: Math.atan2(fromZ - toZ, toX - fromX),
    width: Math.hypot(toX - fromX, toZ - fromZ),
    height,
  }
})

export default {
  northwest,
  north,
  northeast,
  west: planWall(lodge.size, 'west', height, {
    holes: {
      corridor: {
        u: lodge.center[1] - lodge.returnZ,
        width: lodge.timberWidth,
        height: 3.4,
        profile: 'arch',
      },
      window: {
        u: lodge.center[1] - lodgeWindow.z,
        width: lodgeWindow.width,
        bottom: lodgeWindow.bottom - lodge.floorY,
        height: lodgeWindow.top - lodge.floorY,
        profile: 'rectangle',
      },
    },
  }),
  east: planWall(lodge.size, 'east', height, {
    holes: {
      fortress: {
        u: lodge.tunnelZ - lodge.center[1],
        width: lodge.passageWidth,
        height: 3.4,
        profile: 'arch',
      },
    },
  }),
  south: planWall(lodge.size, 'south', height),
} satisfies Record<string, RoomWall>

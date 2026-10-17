import type {Wall, WallOpening} from '../placement/wallGeometry.ts'
import type {Placement, Portrait, RoomId, Vec3} from './types.ts'

import {GalleryPlacementSpace} from '../placement/GalleryPlacementSpace.ts'
import corridor, {corridorPassage, corridorStairFloor, corridorWalls, insideCorridor} from './corridor.ts'
import mainEntrance from './entrance.ts'
import lobby from './lobby.ts'
import lodge, {insideLodgeAccess, lodgeTunnel, lodgeTunnelWalls, lodgeWindow, lodgeWindowFloor} from './lodge.ts'
import lowerGallery, {oculusPlatform, oculusRamps, rampFloorHeight} from './lowerGallery.ts'
import {craterTerrain} from './moonfall/CraterTerrain.ts'
import {balconyFloorHeight} from './oculusBalcony.ts'
import {towerFloorHeight} from './oculusTower.ts'
import salon from './salon.ts'
import staircase, {insideStairway, stairFlights, stairFloorHeight, stairTurn} from './staircase.ts'
import {tunnelDisplayWindow} from './tunnelDisplays.ts'

export type {Wall, WallOpening, WallReservation} from '../placement/wallGeometry.ts'
export {insideOpening, obstructionIssue, openingTop, placementIssue, placementIssues, wallCoordinates, wallPosition} from '../placement/wallGeometry.ts'

export const rooms = [
  {
    id: 'lobby',
    floorY: 0,
    height: 5.8,
    number: '01',
    title: 'Lobby',
    subtitle: 'Nothing here is quite as it seems.',
    center: [0, (lobby.northZ + lobby.southZ) / 2],
    size: [lobby.width, lobby.southZ - lobby.northZ],
    color: '#c6c7ae',
  },
  {
    id: 'vesper',
    floorY: 0,
    height: 5.8,
    number: '02',
    title: 'The Vesper',
    subtitle: 'Old masters. New misunderstandings.',
    center: [-14, 0],
    size: [12, 16],
    color: '#7b9986',
  },
  {
    id: 'dine',
    floorY: 0,
    height: 5.8,
    number: '03',
    title: 'Dine',
    subtitle: 'A change of perspective is encouraged.',
    center: [14, 0],
    size: [12, 16],
    color: '#af9294',
  },
  {
    id: 'antechamber',
    floorY: 0,
    height: 5.8,
    number: '04',
    title: 'The Antechamber',
    subtitle: 'A pause between the peculiar and the profound.',
    center: [0, 11.5],
    size: [8, 7],
    color: '#d4be90',
  },
  {
    id: 'sienna',
    floorY: 0,
    height: 5.8,
    number: '05',
    title: 'The Sienna',
    subtitle: 'Low light. Rich textures. Questionable company.',
    center: [-14, 14],
    size: [12, 12],
    color: '#674b37',
  },
  {
    id: 'moonfall',
    floorY: lowerGallery.floorY,
    height: 5.8,
    number: '06',
    title: 'Moonfall',
    subtitle: 'Down the stairs. Out of the ordinary.',
    center: lowerGallery.moonfall.center,
    size: lowerGallery.moonfall.size,
    color: '#264c54',
  },
  {
    id: 'oculus',
    floorY: lowerGallery.floorY,
    // Stop at the ceiling underside, not the upper room’s walkable surface.
    height: lowerGallery.oculus.ceiling.topY - lowerGallery.oculus.ceiling.thickness - lowerGallery.floorY,
    number: '07',
    title: 'Oculus',
    subtitle: 'Borrowed light from the gallery above.',
    center: lowerGallery.oculus.center,
    size: lowerGallery.oculus.size,
    color: '#7e9298',
  },
  {
    id: 'lodge',
    floorY: lodge.floorY,
    height: lodge.height,
    number: '08',
    title: 'Lodge',
    subtitle: 'Weathered stone. Warm timber. A way back through the corridor.',
    center: lodge.center,
    size: lodge.size,
    color: '#936d47',
  },
  {
    id: 'corridor',
    floorY: corridor.floorY,
    height: corridor.height,
    number: '09',
    title: 'Corridor',
    subtitle: 'Timber, turns and the long way back to Sienna.',
    center: corridor.center,
    size: corridor.size,
    color: '#8c6747',
  },
  {
    id: 'salon',
    floorY: 0,
    height: 5.8,
    number: '10',
    title: 'The Salon',
    subtitle: 'Hung frame to frame. Judged elbow to elbow.',
    center: salon.center,
    size: salon.size,
    color: '#7d2a31',
  },
] as const

const tunnelContains = ([x, y, z]: Vec3) => Math.abs(x - lowerGallery.tunnel.x) <= lowerGallery.tunnel.width / 2 && z >= lowerGallery.tunnel.northZ && z <= lowerGallery.tunnel.southZ && y >= lowerGallery.floorY - 1 && y <= lowerGallery.floorY + lowerGallery.tunnel.height
const contains = (room: (typeof rooms)[number], position: Vec3) => {
  if (room.id === 'corridor') {
    return insideCorridor(position)
  }
  const [x, y, z] = position
  const ground = room.id === 'moonfall' ? Math.min(room.floorY, room.floorY + craterTerrain.height(x - room.center[0], z - room.center[1])) : room.floorY
  return y >= ground - 1 && y <= room.floorY + room.height + 0.2 && Math.abs(x - room.center[0]) <= room.size[0] / 2 && Math.abs(z - room.center[1]) <= room.size[1] / 2
}
export const galleryBounds = {
  minX: Math.min(...rooms.map(room => room.center[0] - room.size[0] / 2), ...[lodgeTunnel, corridorPassage].flatMap(passage => passage.floors.map(floor => floor.center[0] - floor.size[0] / 2))),
  maxX: Math.max(...rooms.map(room => room.center[0] + room.size[0] / 2)),
  minZ: Math.min(...rooms.map(room => room.center[1] - room.size[1] / 2)),
  maxZ: Math.max(...rooms.map(room => room.center[1] + room.size[1] / 2)),
}

export function insideGallery(position: Vec3) {
  return position.every(Number.isFinite) && (rooms.some(room => contains(room, position)) || insideStairway(position) || tunnelContains(position) || insideLodgeAccess(position))
}

export function roomVisit(room: (typeof rooms)[number]): {
  position: Vec3
  rotation: [number, number, number, number]
} {
  if (room.id === 'corridor') {
    return {
      position: [corridor.center[0], corridor.floorY + 1.7, corridor.center[1]],
      rotation: [0, 0, 0, 1],
    }
  }
  return {
    position: [room.center[0], room.floorY + 1.7, room.center[1] + (room.id === 'antechamber' ? -1.1 : room.size[1] / 2 - 2.4)],
    rotation: room.id === 'antechamber' ? [0, 1, 0, 0] : [0, 0, 0, 1],
  }
}
const wall = (id: string, room: RoomId, x: number, z: number, rotation: number, width: number, holes?: Wall['holes']): Wall => ({
  id,
  room,
  center: [x, rooms.find(value => value.id === room)!.floorY, z],
  rotation,
  width,
  height: rooms.find(value => value.id === room)!.height - 0.3,
  holes,
})
const roomWall = (roomId: RoomId, side: 'east' | 'north' | 'south' | 'west', holes?: Wall['holes']) => {
  const room = rooms.find(value => value.id === roomId)!
  const [x, z] = room.center
  const [width, depth] = room.size
  const sides = {
    north: [x, z - depth / 2, 0, width],
    east: [x + width / 2, z, -Math.PI / 2, depth],
    south: [x, z + depth / 2, Math.PI, width],
    west: [x - width / 2, z, Math.PI / 2, depth],
  } as const
  const [wallX, wallZ, rotation, length] = sides[side]
  const result = wall(`${roomId}-${side}`, roomId, wallX, wallZ, rotation, length, holes)
  if (roomId === 'oculus') {
    result.trimStyle = 'plain'
    if (side === 'north') {
      const height = oculusPlatform.position[1] + oculusPlatform.size[1] / 2 - room.floorY
      result.baseboardProfile = [[-length / 2, height], [length / 2, height]]
    } else {
      const ramp = oculusRamps.find(value => value.side === side)
      if (ramp) {
        result.baseboardProfile = [
          [room.center[1] - depth / 2, ramp.rise],
          [ramp.startZ - ramp.run, ramp.rise],
          [ramp.startZ, 0],
          [room.center[1] + depth / 2, 0],
        ].map(([worldZ, y]): [number, number] => [(worldZ - room.center[1]) * (side === 'east' ? 1 : -1), y]).toSorted((a, b) => a[0] - b[0])
      }
    }
  }
  return result
}
const doorway: Array<WallOpening> = [
  {
    u: -3,
    width: 2.8,
    height: 3.8,
    profile: 'arch',
  },
]
const walls: Array<Wall> = [
  {
    ...wall('lobby-north', 'lobby', 0, lobby.northZ, 0, lobby.width),
    reservations: [mainEntrance.reservation],
  },
  // Keep the original side walls and doorways fixed; extend only their north ends.
  wall('lobby-extension-west', 'lobby', -lobby.width / 2, (lobby.northZ + lobby.previousNorthZ) / 2, Math.PI / 2, lobby.previousNorthZ - lobby.northZ),
  wall('lobby-extension-east', 'lobby', lobby.width / 2, (lobby.northZ + lobby.previousNorthZ) / 2, -Math.PI / 2, lobby.previousNorthZ - lobby.northZ),
  wall('lobby-west', 'lobby', -8, 0, Math.PI / 2, 16, doorway),
  wall('lobby-east', 'lobby', 8, 0, -Math.PI / 2, 16, [
    {
      u: 3,
      width: 2.8,
      height: 3.8,
      profile: 'arch',
    },
  ]),
  wall('lobby-south', 'lobby', 0, 8, Math.PI, 16, [
    {
      u: 0,
      width: 2.6,
      height: 3.6,
      profile: 'rectangle',
    },
  ]),
  wall('vesper-north', 'vesper', -14, -8, 0, 12),
  wall('vesper-west', 'vesper', -20, 0, Math.PI / 2, 16),
  wall('vesper-south', 'vesper', -14, 8, Math.PI, 12, [
    {
      u: -3.8,
      width: 2.8,
      height: 3.8,
      profile: 'arch',
    },
  ]),
  wall('vesper-east', 'vesper', -8, 0, -Math.PI / 2, 16, [
    {
      u: 3,
      width: 2.8,
      height: 3.8,
      profile: 'arch',
    },
  ]),
  wall('dine-north', 'dine', 14, -8, 0, 12, [salon.doorway]),
  wall('dine-east', 'dine', 20, 0, -Math.PI / 2, 16),
  wall('dine-south', 'dine', 14, 8, Math.PI, 12),
  wall('dine-west', 'dine', 8, 0, Math.PI / 2, 16, doorway),
  roomWall('salon', 'north'),
  roomWall('salon', 'east'),
  roomWall('salon', 'south', [salon.doorway]),
  roomWall('salon', 'west'),
  wall('antechamber-north', 'antechamber', 0, 8, 0, 8, [
    {
      u: 0,
      width: 2.6,
      height: 3.6,
      profile: 'rectangle',
    },
  ]),
  wall('antechamber-west', 'antechamber', -4, 11.5, Math.PI / 2, 7),
  wall('antechamber-east', 'antechamber', 4, 11.5, -Math.PI / 2, 7, [
    {
      u: 0,
      width: staircase.width,
      height: 3.6,
      profile: 'rectangle',
    },
  ]),
  wall('antechamber-south', 'antechamber', 0, 15, Math.PI, 8),
  wall('sienna-north', 'sienna', -14, 8, 0, 12, [
    {
      u: 3.8,
      width: 2.8,
      height: 3.8,
      profile: 'arch',
    },
  ]),
  wall('sienna-west', 'sienna', -20, 14, Math.PI / 2, 12, [
    {
      u: 14 - lodge.siennaZ,
      width: lodge.timberWidth,
      height: 3.4,
      profile: 'arch',
    },
  ]),
  wall('sienna-east', 'sienna', -8, 14, -Math.PI / 2, 12),
  wall('sienna-south', 'sienna', -14, 20, Math.PI, 12),
  roomWall('moonfall', 'north', [
    {
      u: lowerGallery.tunnel.x - lowerGallery.moonfall.center[0],
      width: lowerGallery.tunnel.width,
      height: 3.6,
      profile: 'rectangle',
    },
  ]),
  roomWall('moonfall', 'east', [
    {
      u: staircase.returnZ - lowerGallery.moonfall.center[1],
      width: staircase.lowerWidth,
      height: 3.6,
      profile: 'rectangle',
    },
  ]),
  roomWall('moonfall', 'south'),
  roomWall('moonfall', 'west'),
  ...stairFlights.flatMap(flight => [-1, 1].map(side => flight.wall(side))),
  ...stairTurn.walls(),
  roomWall('oculus', 'north', [
    {
      u: lodge.entranceX,
      bottom: lodge.floorY - lowerGallery.floorY,
      width: lodge.passageWidth,
      height: lodge.floorY - lowerGallery.floorY + 3.4,
      profile: 'arch',
    },
  ]),
  roomWall('oculus', 'east'),
  roomWall('oculus', 'west'),
  roomWall('lodge', 'north'),
  roomWall('lodge', 'west', [
    {
      u: lodge.center[1] - lodge.returnZ,
      width: lodge.timberWidth,
      height: 3.4,
      profile: 'arch',
    },
    {
      u: lodge.center[1] - lodgeWindow.z,
      width: lodgeWindow.width,
      bottom: lodgeWindow.bottom - lodge.floorY,
      height: lodgeWindow.top - lodge.floorY,
      profile: 'rectangle',
    },
  ]),
  roomWall('lodge', 'east', [
    {
      u: lodge.tunnelZ - lodge.center[1],
      width: lodge.passageWidth,
      height: 3.4,
      profile: 'arch',
    },
  ]),
  roomWall('lodge', 'south'),
  ...lodgeTunnelWalls,
  ...corridorWalls,
  roomWall('oculus', 'south', [
    {
      u: 0,
      width: lowerGallery.tunnel.width,
      height: 3.6,
      profile: 'rectangle',
    },
  ]),
  ...[-1, 1].map(side => ({
    ...wall(`oculus-tunnel-${side < 0 ? 'west' : 'east'}`, 'oculus', lowerGallery.tunnel.x + side * lowerGallery.tunnel.width / 2, (lowerGallery.tunnel.northZ + lowerGallery.tunnel.southZ) / 2, side < 0 ? Math.PI / 2 : -Math.PI / 2, lowerGallery.tunnel.southZ - lowerGallery.tunnel.northZ, [
      {
        u: 0,
        bottom: tunnelDisplayWindow.bottom,
        height: tunnelDisplayWindow.top,
        width: tunnelDisplayWindow.width,
        glassThickness: tunnelDisplayWindow.glassThickness,
        profile: 'rectangle',
      },
    ]),
    height: lowerGallery.tunnel.height,
    hangable: false,
    trimStyle: 'plain' as const,
  })),
]

export function roomAt(position: Vec3): RoomId {
  if (insideCorridor(position)) {
    return 'corridor'
  }
  const room = rooms.find(value => value.id !== 'corridor' && contains(value, position))
  if (room) {
    return room.id
  }
  if (insideStairway(position)) {
    return 'moonfall'
  }
  if (insideLodgeAccess(position)) {
    return 'lodge'
  }
  return tunnelContains(position) ? 'oculus' : 'lobby'
}
/** Where artworks hang and land in the museum. */
export const galleryPlacement = /* @__PURE__ */ new GalleryPlacementSpace(walls, {
  contains: insideGallery,
  floorHeight,
})

export function findPlacement(origin: Vec3, direction: Vec3, width: number, height: number, portraits: ReadonlyArray<Portrait>, ignoreId = ''): Placement | null {
  return galleryPlacement.findPlacement(origin, direction, width, height, portraits, ignoreId)
}

export function wallDistance(origin: Vec3, direction: Vec3) {
  const hit = findPlacement(origin, direction, 0, 0, [])
  return hit ? Math.hypot(...hit.position.map((v, i) => v - origin[i]) as Vec3) + 0.3 : Infinity
}

// Prefer the highest nearby floor below the caller, not the first horizontal match.
// This also recovers loose objects slightly below a slab in stacked rooms.
export function floorHeight([x, y, z]: Vec3) {
  const heights = rooms.filter(room => Math.abs(x - room.center[0]) <= room.size[0] / 2 && Math.abs(z - room.center[1]) <= room.size[1] / 2).map(room => room.floorY + (room.id === 'moonfall' ? craterTerrain.height(x - room.center[0], z - room.center[1]) : 0))
  const sill = lodgeWindowFloor(x, z)
  if (sill !== undefined) {
    heights.push(sill)
  }
  const corridorStair = corridorStairFloor(x, z)
  if (corridorStair !== undefined) {
    heights.push(corridorStair)
  }
  for (const passage of [lodgeTunnel, corridorPassage]) {
    const floor = passage.floorAt(x, z)
    if (floor !== undefined) {
      heights.push(floor)
    }
  }
  if (Math.abs(x - oculusPlatform.position[0]) <= oculusPlatform.size[0] / 2 && Math.abs(z - oculusPlatform.position[2]) <= oculusPlatform.size[2] / 2) {
    heights.push(oculusPlatform.position[1] + oculusPlatform.size[1] / 2)
  }
  const balcony = balconyFloorHeight(x, z)
  if (balcony !== undefined) {
    heights.push(balcony)
  }
  const tower = towerFloorHeight(x, z)
  if (tower !== undefined) {
    heights.push(tower)
  }
  const stair = stairFloorHeight(x, z)
  if (stair !== undefined) {
    heights.push(stair)
  }
  const ramp = rampFloorHeight(x, z)
  if (ramp !== undefined) {
    heights.push(ramp)
  }
  if (tunnelContains([x, lowerGallery.floorY, z])) {
    heights.push(lowerGallery.floorY)
  }
  heights.sort((a, b) => b - a)
  return heights.find(height => y >= height - 1) ?? heights.at(-1) ?? 0
}

export default walls

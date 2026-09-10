import type {Placement, Portrait, RoomId, Vec3} from './types.ts'

import {cabin, cabinPassages, cabinRouteWalls, cabinStairFloor, cabinWindow, cabinWindowFloor, cabinWindowGlassDistance, insideCabinRoute} from './cabin.ts'
import {daydream} from './daydream.ts'
import {mainEntrance} from './entrance.ts'
import {balconyFloorHeight} from './glasswellBalcony.ts'
import {towerFloorHeight} from './glasswellTower.ts'
import {glasswellPlatform, glasswellRamps, lowerGallery, rampFloorHeight} from './lowerGallery.ts'
import {portraitLabel, portraitLabelLayout} from './portraitLabel.ts'
import {insideStairway, staircase, stairFlights, stairFloorHeight, stairTurn} from './staircase.ts'
import {tunnelDisplayWindow} from './tunnelDisplays.ts'
import {craterTerrain} from './undertone/CraterTerrain.ts'

export const placementReach = 10

export type WallOpening = {
  bottom?: number
  glassThickness?: number
  height: number
  profile: 'arch' | 'rectangle'
  u: number
  width: number
}

export type Wall = {
  baseboardHeight?: number
  baseboardProfile?: Array<readonly [number, number]>
  center: Vec3
  /** Signed bend radius, measured from the untrimmed wall plane. */
  curveRadius?: number
  hangable?: boolean
  height: number
  holes?: Array<WallOpening>
  id: string
  /** Solid architectural features which must remain free of hanging artwork. */
  reservations?: Array<WallOpening>
  room: RoomId
  rotation: number
  slope?: number
  trimStyle?: 'classic' | 'none' | 'plain'
  width: number
}

export const rooms = [
  {
    id: 'daydream',
    floorY: 0,
    height: 5.8,
    number: '01',
    title: 'The Daydream Wing',
    subtitle: 'Nothing here is quite as it seems.',
    center: [0, (daydream.northZ + daydream.southZ) / 2],
    size: [daydream.width, daydream.southZ - daydream.northZ],
    color: '#c6c7ae',
  },
  {
    id: 'cabinet',
    floorY: 0,
    height: 5.8,
    number: '02',
    title: 'Cabinet of Curiosities',
    subtitle: 'Old masters. New misunderstandings.',
    center: [-14, 0],
    size: [12, 16],
    color: '#7b9986',
  },
  {
    id: 'afterhours',
    floorY: 0,
    height: 5.8,
    number: '03',
    title: 'The Afterhours Salon',
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
    id: 'amber',
    floorY: 0,
    height: 5.8,
    number: '05',
    title: 'The Amber Room',
    subtitle: 'Low light. Rich textures. Questionable company.',
    center: [-14, 14],
    size: [12, 12],
    color: '#674b37',
  },
  {
    id: 'undertone',
    floorY: lowerGallery.floorY,
    height: 5.8,
    number: '06',
    title: 'The Undertone',
    subtitle: 'Down the stairs. Out of the ordinary.',
    center: lowerGallery.undertone.center,
    size: lowerGallery.undertone.size,
    color: '#264c54',
  },
  {
    id: 'glasswell',
    floorY: lowerGallery.floorY,
    // Stop at the ceiling underside, not the upper room’s walkable surface.
    height: lowerGallery.glasswell.ceiling.topY - lowerGallery.glasswell.ceiling.thickness - lowerGallery.floorY,
    number: '07',
    title: 'The Glasswell',
    subtitle: 'Borrowed light from the gallery above.',
    center: lowerGallery.glasswell.center,
    size: lowerGallery.glasswell.size,
    color: '#7e9298',
  },
  {
    id: 'cabin',
    floorY: cabin.floorY,
    height: cabin.height,
    number: '08',
    title: 'The Cabin',
    subtitle: 'Weathered stone. Warm timber. A way back to Amber.',
    center: cabin.center,
    size: cabin.size,
    color: '#936d47',
  },
] as const

const tunnelContains = ([x, y, z]: Vec3) => Math.abs(x - lowerGallery.tunnel.x) <= lowerGallery.tunnel.width / 2 && z >= lowerGallery.tunnel.northZ && z <= lowerGallery.tunnel.southZ && y >= lowerGallery.floorY - 1 && y <= lowerGallery.floorY + lowerGallery.tunnel.height
const contains = (room: (typeof rooms)[number], [x, y, z]: Vec3) => {
  const ground = room.id === 'undertone' ? Math.min(room.floorY, room.floorY + craterTerrain.height(x - room.center[0], z - room.center[1])) : room.floorY
  return y >= ground - 1 && y <= room.floorY + room.height + 0.2 && Math.abs(x - room.center[0]) <= room.size[0] / 2 && Math.abs(z - room.center[1]) <= room.size[1] / 2
}

export const galleryBounds = {
  minX: Math.min(...rooms.map(room => room.center[0] - room.size[0] / 2), ...cabinPassages.flatMap(passage => passage.floors.map(floor => floor.center[0] - floor.size[0] / 2))),
  maxX: Math.max(...rooms.map(room => room.center[0] + room.size[0] / 2)),
  minZ: Math.min(...rooms.map(room => room.center[1] - room.size[1] / 2)),
  maxZ: Math.max(...rooms.map(room => room.center[1] + room.size[1] / 2)),
}

export function insideGallery(position: Vec3) {
  return position.every(Number.isFinite) && (rooms.some(room => contains(room, position)) || insideStairway(position) || tunnelContains(position) || insideCabinRoute(position))
}

export function roomVisit(room: (typeof rooms)[number]): {position: Vec3
  rotation: [number, number, number, number]} {
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
  if (roomId === 'glasswell') {
    result.trimStyle = 'plain'
    if (side === 'north') {
      const height = glasswellPlatform.position[1] + glasswellPlatform.size[1] / 2 - room.floorY
      result.baseboardProfile = [[-length / 2, height], [length / 2, height]]
    } else {
      const ramp = glasswellRamps.find(value => value.side === side)
      if (ramp) {
        result.baseboardProfile = [
          [room.center[1] - depth / 2, ramp.rise],
          [ramp.startZ - ramp.run, ramp.rise],
          [ramp.startZ, 0],
          [room.center[1] + depth / 2, 0],
        ].map(([worldZ, y]): [number, number] => [(worldZ! - room.center[1]) * (side === 'east' ? 1 : -1), y!]).toSorted((a, b) => a[0] - b[0])
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
export const walls: Array<Wall> = [
  {
    ...wall('daydream-north', 'daydream', 0, daydream.northZ, 0, daydream.width),
    reservations: [mainEntrance.reservation],
  },
  // Keep the original side walls and doorways fixed; extend only their north ends.
  wall('daydream-extension-west', 'daydream', -daydream.width / 2, (daydream.northZ + daydream.previousNorthZ) / 2, Math.PI / 2, daydream.previousNorthZ - daydream.northZ),
  wall('daydream-extension-east', 'daydream', daydream.width / 2, (daydream.northZ + daydream.previousNorthZ) / 2, -Math.PI / 2, daydream.previousNorthZ - daydream.northZ),
  wall('daydream-west', 'daydream', -8, 0, Math.PI / 2, 16, doorway),
  wall('daydream-east', 'daydream', 8, 0, -Math.PI / 2, 16, [
    {
      u: 3,
      width: 2.8,
      height: 3.8,
      profile: 'arch',
    },
  ]),
  wall('daydream-south', 'daydream', 0, 8, Math.PI, 16, [
    {
      u: 0,
      width: 2.6,
      height: 3.6,
      profile: 'rectangle',
    },
  ]),
  wall('cabinet-north', 'cabinet', -14, -8, 0, 12),
  wall('cabinet-west', 'cabinet', -20, 0, Math.PI / 2, 16),
  wall('cabinet-south', 'cabinet', -14, 8, Math.PI, 12, [
    {
      u: -3.8,
      width: 2.8,
      height: 3.8,
      profile: 'arch',
    },
  ]),
  wall('cabinet-east', 'cabinet', -8, 0, -Math.PI / 2, 16, [
    {
      u: 3,
      width: 2.8,
      height: 3.8,
      profile: 'arch',
    },
  ]),
  wall('afterhours-north', 'afterhours', 14, -8, 0, 12),
  wall('afterhours-east', 'afterhours', 20, 0, -Math.PI / 2, 16),
  wall('afterhours-south', 'afterhours', 14, 8, Math.PI, 12),
  wall('afterhours-west', 'afterhours', 8, 0, Math.PI / 2, 16, doorway),
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
  wall('amber-north', 'amber', -14, 8, 0, 12, [
    {
      u: 3.8,
      width: 2.8,
      height: 3.8,
      profile: 'arch',
    },
  ]),
  wall('amber-west', 'amber', -20, 14, Math.PI / 2, 12, [
    {
      u: 14 - cabin.amberZ,
      width: cabin.timberWidth,
      height: 3.4,
      profile: 'arch',
    },
  ]),
  wall('amber-east', 'amber', -8, 14, -Math.PI / 2, 12),
  wall('amber-south', 'amber', -14, 20, Math.PI, 12),
  roomWall('undertone', 'north', [
    {
      u: lowerGallery.tunnel.x - lowerGallery.undertone.center[0],
      width: lowerGallery.tunnel.width,
      height: 3.6,
      profile: 'rectangle',
    },
  ]),
  roomWall('undertone', 'east', [
    {
      u: staircase.returnZ - lowerGallery.undertone.center[1],
      width: staircase.lowerWidth,
      height: 3.6,
      profile: 'rectangle',
    },
  ]),
  roomWall('undertone', 'south'),
  roomWall('undertone', 'west'),
  ...stairFlights.flatMap(flight => [-1, 1].map(side => flight.wall(side))),
  ...stairTurn.walls(),
  roomWall('glasswell', 'north', [
    {
      u: cabin.entranceX,
      bottom: cabin.floorY - lowerGallery.floorY,
      width: cabin.passageWidth,
      height: cabin.floorY - lowerGallery.floorY + 3.4,
      profile: 'arch',
    },
  ]),
  roomWall('glasswell', 'east'),
  roomWall('glasswell', 'west'),
  roomWall('cabin', 'north'),
  roomWall('cabin', 'west', [
    {
      u: cabin.center[1] - cabin.returnZ,
      width: cabin.timberWidth,
      height: 3.4,
      profile: 'arch',
    },
    {
      u: cabin.center[1] - cabinWindow.z,
      width: cabinWindow.width,
      bottom: cabinWindow.bottom - cabin.floorY,
      height: cabinWindow.top - cabin.floorY,
      profile: 'rectangle',
    },
  ]),
  roomWall('cabin', 'east', [
    {
      u: cabin.tunnelZ - cabin.center[1],
      width: cabin.passageWidth,
      height: 3.4,
      profile: 'arch',
    },
  ]),
  roomWall('cabin', 'south'),
  ...cabinRouteWalls,
  roomWall('glasswell', 'south', [
    {
      u: 0,
      width: lowerGallery.tunnel.width,
      height: 3.6,
      profile: 'rectangle',
    },
  ]),
  ...[-1, 1].map(side => ({
    ...wall(`glasswell-tunnel-${side < 0 ? 'west' : 'east'}`, 'glasswell', lowerGallery.tunnel.x + side * lowerGallery.tunnel.width / 2, (lowerGallery.tunnel.northZ + lowerGallery.tunnel.southZ) / 2, side < 0 ? Math.PI / 2 : -Math.PI / 2, lowerGallery.tunnel.southZ - lowerGallery.tunnel.northZ, [
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

// This profile is shared by CSG cutters, portal trim and interaction ray tests.
export function openingTop(hole: WallOpening, u: number, padding = 0) {
  const radius = hole.width / 2 + padding
  const x = Math.abs(u - hole.u)
  if (x > radius) {
    return -Infinity
  }
  return hole.profile === 'arch' ? hole.height - hole.width / 2 + Math.sqrt(Math.max(0, radius ** 2 - x ** 2)) : hole.height + padding
}

export function insideOpening(hole: WallOpening, u: number, y: number) {
  return y >= (hole.bottom ?? 0) && y < openingTop(hole, u)
}

export function roomAt(position: Vec3): RoomId {
  const room = rooms.find(value => contains(value, position))
  if (room) {
    return room.id
  }
  if (insideStairway(position)) {
    return 'undertone'
  }
  if (insideCabinRoute(position)) {
    return 'cabin'
  }
  return tunnelContains(position) ? 'glasswell' : 'daydream'
}

export function wallPosition(wall: Wall, u: number, y: number, offset = 0.22): Vec3 {
  const sin = Math.sin(wall.rotation)
  const cos = Math.cos(wall.rotation)
  const radius = wall.curveRadius
  const x = radius ? (radius - offset) * Math.sin(u / radius) : u
  const z = radius ? radius - (radius - offset) * Math.cos(u / radius) : offset
  return [wall.center[0] + x * cos + z * sin, y, wall.center[2] - x * sin + z * cos]
}

export function wallCoordinates(wall: Wall, [x, , z]: Vec3) {
  const u = (x - wall.center[0]) * Math.cos(wall.rotation) - (z - wall.center[2]) * Math.sin(wall.rotation)
  if (wall.curveRadius) {
    const depth = (x - wall.center[0]) * Math.sin(wall.rotation) + (z - wall.center[2]) * Math.cos(wall.rotation)
    return Math.atan2(u / wall.curveRadius, 1 - depth / wall.curveRadius) * wall.curveRadius
  }
  return u
}

export function placementIssue(wall: Wall, position: Vec3, width: number, height: number, portraits: ReadonlyArray<Portrait>, ignoreId = '') {
  const u = wallCoordinates(wall, position)
  if (wall.hangable === false) {
    return 'Keep the stairway clear.'
  }
  // Include the frame, the physical label and a small breathing space.
  const label = portraitLabelLayout(width, height)
  const halfWidth = Math.max(width / 2 + 0.16, label.width / 2)
  const bottom = position[1] + label.bottom - portraitLabel.clearance
  const top = position[1] + height / 2 + 0.16
  if (Math.abs(u) + halfWidth > wall.width / 2 - 0.24 || bottom < wall.center[1] + 0.48 || top > wall.center[1] + wall.height - 0.55) {
    return 'Leave space for the frame and its label.'
  }
  if ([...wall.holes ?? [], ...wall.reservations ?? []].some(hole => Math.abs(u - hole.u) < halfWidth + hole.width / 2 + 0.14 && bottom < wall.center[1] + hole.height + 0.14 && top > wall.center[1] + (hole.bottom ?? 0) - 0.14)) {
    return 'Let’s keep the doorway clear.'
  }
  if (portraits.some(p => p.id !== ignoreId && p.hung && p.wallId === wall.id && Math.abs(wallCoordinates(wall, p.position) - u) < halfWidth + p.width / 2 + 0.18 && top > p.position[1] + portraitLabelLayout(p.width, p.height).bottom - portraitLabel.neighborClearance && bottom < p.position[1] + p.height / 2 + 0.23)) {
    return 'A little too close to another masterpiece.'
  }
  return ''
}

const wallRayDistance = (targetWall: Wall, origin: Vec3, direction: Vec3) => {
  const sin = Math.sin(targetWall.rotation)
  const cos = Math.cos(targetWall.rotation)
  const facing = direction[0] * sin + direction[2] * cos
  if (!targetWall.curveRadius) {
    return facing < -0.0001 ? ((targetWall.center[0] - origin[0]) * sin + (targetWall.center[2] - origin[2]) * cos) / facing : Infinity
  }
  const radius = targetWall.curveRadius
  const x = (origin[0] - targetWall.center[0]) * cos - (origin[2] - targetWall.center[2]) * sin
  const z = (origin[0] - targetWall.center[0]) * sin + (origin[2] - targetWall.center[2]) * cos - radius
  const dx = direction[0] * cos - direction[2] * sin
  const dz = facing
  const a = dx * dx + dz * dz
  const b = 2 * (x * dx + z * dz)
  const c = x * x + z * z - radius * radius
  const discriminant = b * b - 4 * a * c
  if (a < 1e-12 || discriminant < 0) {
    return Infinity
  }
  for (const distance of [(-b - Math.sqrt(discriminant)) / (2 * a), (-b + Math.sqrt(discriminant)) / (2 * a)]) {
    const angle = Math.atan2((x + dx * distance) / radius, -(z + dz * distance) / radius)
    if (distance >= 0 && Math.abs(angle * radius) <= targetWall.width / 2 + 1e-9 && -dx * Math.sin(angle) + dz * Math.cos(angle) < -0.0001) {
      return distance
    }
  }
  return Infinity
}

export function findPlacement(origin: Vec3, direction: Vec3, width: number, height: number, portraits: ReadonlyArray<Portrait>, ignoreId = ''): Placement | null {
  let nearest = cabinWindowGlassDistance(origin, direction) ?? Infinity
  let result: Placement | null = Number.isFinite(nearest) ? {
    inReach: nearest * Math.hypot(...direction) <= placementReach,
    position: [origin[0] + direction[0] * nearest, origin[1] + direction[1] * nearest, origin[2] + direction[2] * nearest],
    rotation: direction[0] < 0 ? Math.PI / 2 : -Math.PI / 2,
    wallId: 'cabin-west',
    valid: false,
    reason: 'Keep the window clear.',
  } : null
  for (const wall of walls) {
    const distance = wallRayDistance(wall, origin, direction)
    if (distance < 0 || distance >= nearest) {
      continue
    }
    const point: Vec3 = [origin[0] + direction[0] * distance, origin[1] + direction[1] * distance, origin[2] + direction[2] * distance]
    const u = wallCoordinates(wall, point)
    if (Math.abs(u) > wall.width / 2 || point[1] < wall.center[1] + u * (wall.slope ?? 0) || point[1] > wall.center[1] + u * (wall.slope ?? 0) + wall.height) {
      continue
    }
    if (wall.holes?.some(hole => !hole.glassThickness && insideOpening(hole, u, point[1] - wall.center[1]))) {
      continue
    }
    nearest = distance
    const position = wallPosition(wall, u, point[1])
    const inReach = distance * Math.hypot(...direction) <= placementReach
    const reason = inReach ? placementIssue(wall, position, width, height, portraits, ignoreId) : 'Move closer to hang this artwork.'
    result = {
      inReach,
      position,
      rotation: wall.rotation - (wall.curveRadius ? u / wall.curveRadius : 0),
      wallId: wall.id,
      valid: !reason,
      reason,
    }
  }
  return result
}

export function wallDistance(origin: Vec3, direction: Vec3) {
  const hit = findPlacement(origin, direction, 0, 0, [])
  return hit ? Math.hypot(...hit.position.map((v, i) => v - origin[i]!) as Vec3) + 0.3 : Infinity
}

// Prefer the highest nearby floor below the caller, not the first horizontal match.
// This also recovers loose objects slightly below a slab in stacked rooms.
export function floorHeight([x, y, z]: Vec3) {
  const heights = rooms.filter(room => Math.abs(x - room.center[0]) <= room.size[0] / 2 && Math.abs(z - room.center[1]) <= room.size[1] / 2).map(room => room.floorY + (room.id === 'undertone' ? craterTerrain.height(x - room.center[0], z - room.center[1]) : 0))
  const sill = cabinWindowFloor(x, z)
  if (sill !== undefined) {
    heights.push(sill)
  }
  const cabinStair = cabinStairFloor(x, z)
  if (cabinStair !== undefined) {
    heights.push(cabinStair)
  }
  for (const passage of cabinPassages) {
    const floor = passage.floorAt(x, z)
    if (floor !== undefined) {
      heights.push(floor)
    }
  }
  if (Math.abs(x - glasswellPlatform.position[0]) <= glasswellPlatform.size[0] / 2 && Math.abs(z - glasswellPlatform.position[2]) <= glasswellPlatform.size[2] / 2) {
    heights.push(glasswellPlatform.position[1] + glasswellPlatform.size[1] / 2)
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

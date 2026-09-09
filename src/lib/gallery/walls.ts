import type {Placement, Portrait, RoomId, Vec3} from './types.ts'

import {portraitLabel, portraitLabelLayout} from './portraitLabel.ts'
import {staircase, stairFloorHeight} from './staircase.ts'

export const placementReach = 10

export type WallOpening = {
  height: number
  profile: 'arch' | 'rectangle'
  u: number
  width: number
}

export type Wall = {
  center: Vec3
  hangable?: boolean
  height: number
  holes?: Array<WallOpening>
  id: string
  room: RoomId
  rotation: number
  width: number
}

export const rooms = [
  {
    id: 'daydream',
    floorY: 0,
    number: '01',
    title: 'The Daydream Wing',
    subtitle: 'Nothing here is quite as it seems.',
    center: [0, 0],
    size: [16, 16],
    color: '#c6c7ae',
  },
  {
    id: 'cabinet',
    floorY: 0,
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
    number: '05',
    title: 'The Amber Room',
    subtitle: 'Low light. Rich textures. Questionable company.',
    center: [-14, 14],
    size: [12, 12],
    color: '#674b37',
  },
  {
    id: 'undertone',
    floorY: staircase.bottomY,
    number: '06',
    title: 'The Undertone',
    subtitle: 'Down the stairs. Out of the ordinary.',
    center: [18, 15],
    size: [12, 14],
    color: '#264c54',
  },
] as const

const stairContains = ([x, , z]: Vec3) => {
  return x >= staircase.startX && x <= staircase.endX && Math.abs(z - staircase.z) <= staircase.width / 2
}
const contains = (room: (typeof rooms)[number], [x, y, z]: Vec3) => {
  return y >= room.floorY - 1 && y <= room.floorY + 6 && Math.abs(x - room.center[0]) <= room.size[0] / 2 && Math.abs(z - room.center[1]) <= room.size[1] / 2
}

export const galleryBounds = {
  minX: Math.min(...rooms.map(room => room.center[0] - room.size[0] / 2)),
  maxX: Math.max(...rooms.map(room => room.center[0] + room.size[0] / 2)),
  minZ: Math.min(...rooms.map(room => room.center[1] - room.size[1] / 2)),
  maxZ: Math.max(...rooms.map(room => room.center[1] + room.size[1] / 2)),
}

export function insideGallery(position: Vec3) {
  return position.every(Number.isFinite) && (rooms.some(room => contains(room, position)) || stairContains(position) && position[1] >= stairFloorHeight(position[0]) - 1 && position[1] <= staircase.topY + 3.8)
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
  height: 5.5,
  holes,
})
const doorway: Array<WallOpening> = [
  {
    u: -3,
    width: 2.8,
    height: 3.8,
    profile: 'arch',
  },
]
export const walls: Array<Wall> = [
  wall('daydream-north', 'daydream', 0, -8, 0, 16),
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
  wall('amber-west', 'amber', -20, 14, Math.PI / 2, 12),
  wall('amber-east', 'amber', -8, 14, -Math.PI / 2, 12),
  wall('amber-south', 'amber', -14, 20, Math.PI, 12),
  wall('undertone-north', 'undertone', 18, 8, 0, 12),
  wall('undertone-east', 'undertone', 24, 15, -Math.PI / 2, 14),
  wall('undertone-south', 'undertone', 18, 22, Math.PI, 12),
  wall('undertone-west', 'undertone', 12, 15, Math.PI / 2, 14, [
    {
      u: 3.5,
      width: staircase.width,
      height: 3.6,
      profile: 'rectangle',
    },
  ]),
  ...[-1, 1].map(side => ({
    ...wall(`undertone-stairs-${side < 0 ? 'north' : 'south'}`, 'undertone', 8, staircase.z + side * staircase.width / 2, side < 0 ? 0 : Math.PI, 8),
    height: 7.1,
    hangable: false,
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
  return y >= 0 && y < openingTop(hole, u)
}

export function roomAt(position: Vec3): RoomId {
  return rooms.find(room => contains(room, position))?.id ?? (stairContains(position) ? 'undertone' : 'daydream')
}

export function wallPosition(wall: Wall, u: number, y: number, offset = 0.22): Vec3 {
  const sin = Math.sin(wall.rotation)
  const cos = Math.cos(wall.rotation)
  return [wall.center[0] + u * cos + offset * sin, y, wall.center[2] - u * sin + offset * cos]
}

export function wallCoordinates(wall: Wall, [x, , z]: Vec3) {
  return (x - wall.center[0]) * Math.cos(wall.rotation) - (z - wall.center[2]) * Math.sin(wall.rotation)
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
  if (wall.holes?.some(hole => Math.abs(u - hole.u) < halfWidth + hole.width / 2 + 0.14 && bottom < wall.center[1] + hole.height + 0.14)) {
    return 'Let’s keep the doorway clear.'
  }
  if (portraits.some(p => p.id !== ignoreId && p.hung && p.wallId === wall.id && Math.abs(wallCoordinates(wall, p.position) - u) < halfWidth + p.width / 2 + 0.18 && top > p.position[1] + portraitLabelLayout(p.width, p.height).bottom - portraitLabel.neighborClearance && bottom < p.position[1] + p.height / 2 + 0.23)) {
    return 'A little too close to another masterpiece.'
  }
  return ''
}

export function findPlacement(origin: Vec3, direction: Vec3, width: number, height: number, portraits: ReadonlyArray<Portrait>, ignoreId = ''): Placement | null {
  let nearest = Infinity
  let result: Placement | null = null
  for (const wall of walls) {
    const nx = Math.sin(wall.rotation)
    const nz = Math.cos(wall.rotation)
    const facing = direction[0] * nx + direction[2] * nz
    if (facing >= -0.0001) {
      continue
    }
    const distance = ((wall.center[0] - origin[0]) * nx + (wall.center[2] - origin[2]) * nz) / facing
    if (distance < 0 || distance >= nearest) {
      continue
    }
    const point: Vec3 = [origin[0] + direction[0] * distance, origin[1] + direction[1] * distance, origin[2] + direction[2] * distance]
    const u = wallCoordinates(wall, point)
    if (Math.abs(u) > wall.width / 2 || point[1] < wall.center[1] || point[1] > wall.center[1] + wall.height) {
      continue
    }
    if (wall.holes?.some(hole => insideOpening(hole, u, point[1] - wall.center[1]))) {
      continue
    }
    nearest = distance
    const position = wallPosition(wall, u, point[1])
    const inReach = distance * Math.hypot(...direction) <= placementReach
    const reason = inReach ? placementIssue(wall, position, width, height, portraits, ignoreId) : 'Move closer to hang this artwork.'
    result = {
      inReach,
      position,
      rotation: wall.rotation,
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

// Floor lookup is horizontal: callers also use it to recover objects below the floor.
export function floorHeight([x, , z]: Vec3) {
  if (stairContains([x, 0, z])) {
    return stairFloorHeight(x)
  }
  return rooms.find(room => Math.abs(x - room.center[0]) <= room.size[0] / 2 && Math.abs(z - room.center[1]) <= room.size[1] / 2)?.floorY ?? 0
}

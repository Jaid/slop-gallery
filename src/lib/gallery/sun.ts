import type {Vec3} from './types.ts'

import lobbyVault from './lobbyVault.ts'
import {roomClearHeight, rooms} from './walls.ts'

/** How far the light’s shadow camera stands from the origin along its direction, well above the vault’s crown. */
const distance = 80
/** Rooms beyond the sun’s reach: their materials ignore it, so they need no shadow map. */
const unlitRooms = new Set(['corridor', 'lodge'])
/** Whether the sun reaches into a room at all, so its air can hold sun shafts. */
export const isSunlitRoom = (room: string) => !unlitRooms.has(room)
const up = [0, 1, 0] as const
const cross = (a: readonly [number, number, number], b: readonly [number, number, number]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] as const
const normalize = (v: readonly [number, number, number]) => {
  const l = Math.hypot(...v)
  return [v[0] / l, v[1] / l, v[2] / l] as const
}
const dot = (a: readonly [number, number, number], b: readonly [number, number, number]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** Every point the sun’s shadow map has to cover: the corners of every sunlit room, from below its floor to its ceiling or vault. */
export function sunlitPoints(): Array<Vec3> {
  const points: Array<Vec3> = []
  for (const room of rooms) {
    if (unlitRooms.has(room.id)) {
      continue
    }
    const [x, z] = room.center
    const [width, depth] = room.size
    for (const dx of [-1, 1]) {
      for (const dz of [-1, 1]) {
        for (const y of [room.floorY - 1, room.floorY + roomClearHeight(room) + 0.5]) {
          points.push([x + dx * (width / 2 + 0.5), y, z + dz * (depth / 2 + 0.5)])
        }
      }
    }
  }
  return points
}

const margin = 1

/** Where a directional light shining from `toward` (any length) stands, and the shadow frustum that spans every sunlit room from there. */
export function sunGeometry(toward: Vec3) {
  const direction = normalize(toward)
  // The basis of a camera at the light, looking at the origin, as Object3D.lookAt builds it.
  const right = normalize(cross(up, direction))
  const top = cross(direction, right)
  const projected = sunlitPoints().map(point => [dot(point, right), dot(point, top), distance - dot(point, direction)] as const)
  const bound = (axis: 0 | 1 | 2, pick: typeof Math.max) => pick(...projected.map(point => point[axis]))
  return {
    direction: direction as Vec3,
    position: direction.map(value => value * distance) as unknown as Vec3,
    shadow: {
      left: bound(0, Math.min) - margin,
      right: bound(0, Math.max) + margin,
      bottom: bound(1, Math.min) - margin,
      top: bound(1, Math.max) + margin,
      near: Math.max(0.5, bound(2, Math.min) - margin),
      far: bound(2, Math.max) + margin,
      mapSize: 4096,
      normalBias: 0.035,
    },
  }
}

/**
 * Where the gallery’s midday sun stands: high in the south-west sky, about 61° above the horizon, whose shadow map spans every sunlit room, so the vault and the ceilings keep it out of
 * the rooms and only the Lobby’s glass lets it in. The procedural sky draws its disc in the same direction.
 */
export const sun = sunGeometry([-3, 9, 4])

/** The crown of the Lobby’s vault has to stay in front of the shadow camera, or it would cast no shadow. */
export const sunClearance = distance - dot([0, lobbyVault.crownY, 0], sun.direction)

export default sun

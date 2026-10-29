import type {Vec3} from './types.ts'
import type {Box3} from 'three/webgpu'

import lobbyVault from './lobbyVault.ts'

/** a room the sun may shine into, as far as its shadow map cares */
export type SunlitRoom = {
  /** the room’s air in world meters */
  readonly air: ReadonlyArray<Box3>
  /** whether the sun may reach into it anywhere */
  readonly sunlit: boolean
}

/** How far the light’s shadow camera stands from the origin along its direction, well above the vault’s crown. */
const distance = 80
const margin = 1
const up = [0, 1, 0] as const
const cross = (a: readonly [number, number, number], b: readonly [number, number, number]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] as const
const normalize = (v: readonly [number, number, number]) => {
  const l = Math.hypot(...v)
  return [v[0] / l, v[1] / l, v[2] / l] as const
}
const dot = (a: readonly [number, number, number], b: readonly [number, number, number]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** texels along each axis of the sun’s shadow map in heavy graphics */
export const sunShadowMapSize = 4096

/** Every point the sun’s shadow map has to cover: the corners of the air of every room within the sun’s reach, from below its floor to over its ceiling or vault. */
export function sunlitPoints(rooms: Iterable<SunlitRoom>): Array<Vec3> {
  const points: Array<Vec3> = []
  for (const room of rooms) {
    if (!room.sunlit) {
      continue
    }
    for (const {min, max} of room.air) {
      for (const x of [min.x - 0.5, max.x + 0.5]) {
        for (const z of [min.z - 0.5, max.z + 0.5]) {
          for (const y of [min.y - 1, max.y + 0.5]) {
            points.push([x, y, z])
          }
        }
      }
    }
  }
  return points
}

/** Where a directional light shining from `toward` (any length) stands, and the shadow frustum that spans every one of the points from there. */
export function sunGeometry(toward: Vec3, points: ReadonlyArray<Vec3>) {
  const direction = normalize(toward)
  // The basis of a camera at the light, looking at the origin, as Object3D.lookAt builds it.
  const right = normalize(cross(up, direction))
  const top = cross(direction, right)
  const projected = points.map(point => [dot(point, right), dot(point, top), distance - dot(point, direction)] as const)
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
      mapSize: sunShadowMapSize,
      normalBias: 0.035,
    },
  }
}

/** Direction toward the sun from azimuth (clockwise from north, −z) and elevation, in degrees. */
export function sunDirectionFromAngles(azimuth: number, elevation: number): Vec3 {
  const a = azimuth * Math.PI / 180
  const e = elevation * Math.PI / 180
  return [Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)]
}

/** The direction toward the gallery’s midday sun, 193.7° clockwise from north and 51° above the horizon; only the Lobby’s glazing lets it in. */
export const middaySun = sunDirectionFromAngles(193.7, 51)

/** How far in front of the shadow camera of a sun shining from `direction` the crown of the Lobby’s vault stands, which has to stay in front of it to cast a shadow. */
export function sunClearance(direction: Vec3) {
  return distance - dot([0, lobbyVault.crownY, 0], normalize(direction))
}

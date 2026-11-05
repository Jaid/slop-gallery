import type {Wall, WallOpening} from '../placement/wallGeometry.ts'
import type {Vec3} from './types.ts'

import {wallCoordinates} from '../placement/wallGeometry.ts'
import {floorGlassThickness} from './floors.ts'
import lobby from './lobby.ts'

/** a wall of cast glass between the Lobby extension and a room beside it, standing in their shared wall plane at `x` */
export type LobbyWindow = typeof salonWindow

/**
 * A wall of cast glass between the Lobby extension and the Salon, glazed with the same pavers as the Lobby's floor opening and
 * lined up with it: both span the same 8 m along z, so the floor window's joints run on up the wall.
 *
 * The pane stands in the shared wall plane, centered in the two room faces, and is as thick as the floor glass.
 */
export const salonWindow = {
  x: lobby.width / 2,
  z: lobby.opening.center[1],
  width: lobby.opening.size[1],
  /** The sill clears the Salon's chair rail together with the casing below it. */
  bottom: 1.2,
  top: 4.2,
  thickness: floorGlassThickness,
  /** Edge length of the square cast pavers, matching the floor window's. */
  tileSize: 1,
}
/** The Salon's window mirrored across the Lobby, between the Lobby extension and the Forge, so the Lobby's glass lies symmetric. */
export const forgeWindow: LobbyWindow = {
  ...salonWindow,
  x: -salonWindow.x,
}

/** The hole the window cuts into a wall in its plane, of the Lobby or the room beside it, positioned relative to `origin` like the wall. */
export function lobbyWindowHole(glazing: LobbyWindow, wall: Pick<Wall, 'center' | 'curveRadius' | 'rotation'>, [x, , z]: Vec3 = [0, 0, 0]): WallOpening {
  return {
    u: wallCoordinates(wall, [glazing.x - x, 0, glazing.z - z]),
    width: glazing.width,
    bottom: glazing.bottom,
    height: glazing.top,
    profile: 'rectangle',
  }
}

/** Distance along a ray, in multiples of its direction, to the face of the window's glass it meets first, or `undefined` if it misses. */
export function lobbyWindowGlassDistance(glazing: LobbyWindow, origin: Vec3, direction: Vec3) {
  if (Math.abs(direction[0]) < 1e-9) {
    return
  }
  const x = glazing.x + (direction[0] < 0 ? 1 : -1) * glazing.thickness / 2
  const distance = (x - origin[0]) / direction[0]
  const y = origin[1] + distance * direction[1]
  const z = origin[2] + distance * direction[2]
  if (distance >= 0 && y >= glazing.bottom && y <= glazing.top && Math.abs(z - glazing.z) <= glazing.width / 2) {
    return distance
  }
}

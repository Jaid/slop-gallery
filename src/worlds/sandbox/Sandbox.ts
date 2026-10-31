import type {Vec3} from '#src/lib/gallery/types.ts'

import {lazy} from 'react'

import {FloorPlanPlacementSpace} from '#src/lib/placement/FloorPlanPlacementSpace.ts'
import Cell from '#src/rooms/cell/Cell.ts'
import artworks from '#src/worlds/gallery/artworks.ts'

import World from '../base/World.ts'
import {worlds} from '../index.ts'

const minimap = lazy(() => import('#component/SandboxMinimap'))
const scene = lazy(() => import('#src/rooms/cell/components/CellRoom/index.tsx'))
/** how far the player’s body keeps its middle from the walls */
const bodyRadius = 0.6

/** A world to try things in: a single room, the Cell, with nothing in it but an orb and a few of the gallery’s default works on its side walls. */
export default class Sandbox extends World<Cell> {
  // The gallery’s default works, of which the Cell’s six slots take as many as fit, drawn by the seed.
  override readonly artworks = artworks
  override readonly defaultRoom = 'cell'
  override readonly id = 'sandbox'
  override readonly Minimap = minimap
  // Artworks hang on any of the Cell’s four walls, and lost ones return to the spawn.
  override readonly placement: FloorPlanPlacementSpace
  override readonly Scene = scene

  constructor() {
    super(worlds.sandbox, [[new Cell, [0, 0, 0]]])
    const cell = this.room('cell')
    const [x, , z] = this.spawn.position
    this.placement = new FloorPlanPlacementSpace(this.walls, (pointX, pointZ) => cell.room.floorContains(cell.toLocal([pointX, 0, pointZ])), cell.height, [x, 1, z])
  }

  /** Anywhere on the floor of the Cell or its vestibule a body fits, from the floor up to the ceiling. */
  override contains(position: Vec3) {
    const cell = this.room('cell')
    const [, y] = position
    return y >= -0.2 && y < cell.height && cell.room.floorContains(cell.toLocal(position), bodyRadius)
  }

  /** The Cell’s floor is level everywhere. */
  override floorHeight(_position: Vec3) {
    return 0
  }

  /** How far a ray from the origin travels until it meets a wall, a little farther than the wall itself, and on through the arch. */
  override wallDistance(origin: Vec3, direction: Vec3) {
    const hit = this.placement.findPlacement(origin, direction, 0, 0, [])
    return hit ? Math.hypot(...hit.position.map((value, index) => value - origin[index]) as Vec3) + 0.3 : Infinity
  }
}

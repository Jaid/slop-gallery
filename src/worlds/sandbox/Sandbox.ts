import type {Artwork, Vec3} from '#src/lib/gallery/types.ts'

import {lazy} from 'react'

import {HallPlacementSpace} from '#src/lib/placement/HallPlacementSpace.ts'
import Cell from '#src/rooms/cell/Cell.ts'

import World from '../base/World.ts'
import {worlds} from '../index.ts'

const minimap = lazy(() => import('#component/SandboxMinimap'))
const scene = lazy(() => import('#src/rooms/cell/components/CellRoom/index.tsx'))
/** how far the player’s body keeps its middle from the walls */
const bodyRadius = 0.6

/** A world to try things in: a single room, the Cell, with nothing in it and no works on its walls, only free portrait slots. */
export default class Sandbox extends World<Cell> {
  override readonly artworks: ReadonlyArray<Artwork> = []
  override readonly defaultRoom = 'cell'
  override readonly id = 'sandbox'
  override readonly Minimap = minimap
  // Artworks hang on any of the Cell’s four walls, and lost ones return to the spawn.
  override readonly placement: HallPlacementSpace
  override readonly Scene = scene

  constructor() {
    super(worlds.sandbox, [[new Cell, [0, 0, 0]]])
    const {min, max} = this.room('cell').room.bounds
    const [x, , z] = this.spawn.position
    this.placement = new HallPlacementSpace(this.walls, {
      minX: min.x,
      maxX: max.x,
      northZ: min.z,
      southZ: max.z,
      height: max.y,
    }, [x, 1, z])
  }

  /** Anywhere between the walls a body fits, from the floor up to the ceiling. */
  override contains([x, y, z]: Vec3) {
    const {minX, maxX, northZ, southZ, height} = this.placement.bounds
    return x > minX + bodyRadius && x < maxX - bodyRadius && z > northZ + bodyRadius && z < southZ - bodyRadius && y >= -0.2 && y < height
  }

  /** The Cell’s floor is level everywhere. */
  override floorHeight(_position: Vec3) {
    return 0
  }

  override wallDistance(origin: Vec3, direction: Vec3) {
    return this.placement.wallDistance(origin, direction)
  }
}

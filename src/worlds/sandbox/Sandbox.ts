import type {Orb} from '#src/lib/gallery/orbs/index.ts'
import type {Vec3} from '#src/lib/gallery/types.ts'

import {lazy} from 'react'

import {orbs} from '#src/lib/gallery/orbs/index.ts'
import {FloorPlanPlacementSpace} from '#src/lib/placement/FloorPlanPlacementSpace.ts'
import Cell from '#src/rooms/cell/Cell.ts'
import CellLayout from '#src/rooms/cell/CellLayout.ts'
import artworks from '#src/worlds/gallery/artworks.ts'

import World from '../base/World.ts'
import {worlds} from '../index.ts'
import {readItems} from './items.ts'

const minimap = lazy(() => import('#component/SandboxMinimap'))
const scene = lazy(() => import('#src/rooms/cell/components/CellRoom/index.tsx'))
/** how far the player’s body keeps its middle from the walls */
const bodyRadius = 0.6
/** an item on one of the Cell’s pedestals */
export type SandboxItem = {
  /** its prop’s id, unique in the world: the orb’s own prop id for the first of its kind, numbered from 2 for every further one, like `prop-orb-spook-2` */
  id: string
  orb: Orb
}
/** everything `?item` can put on a pedestal, by its object id */
const placeable: ReadonlyMap<string, Orb> = new Map(orbs.map(orb => [orb.propId, orb]))
/** An item for each of the object ids, in their order, as many of a kind as its id is named, or an error naming the unknown ones. */
function resolveItems(ids: ReadonlyArray<string>): ReadonlyArray<SandboxItem> {
  const unknown = [...new Set(ids.filter(id => !placeable.has(id)))]
  if (unknown.length) {
    throw new Error(`Unknown Sandbox item URL selection: ${unknown.join(', ')}. Known items: ${placeable.keys().toArray().join(', ')}`)
  }
  const counts = new Map<string, number>
  return ids.map(id => {
    const count = (counts.get(id) ?? 0) + 1
    counts.set(id, count)
    return {
      id: count === 1 ? id : `${id}-${count}`,
      orb: placeable.get(id)!,
    }
  })
}

/** A world to try things in: a single room, the Cell, with a few of the gallery’s default works on its walls and nothing else but the items the URL puts on pedestals beyond its north wall. */
export default class Sandbox extends World<Cell> {
  // The gallery’s default works, of which the Cell’s slots take as many as fit, drawn by the seed.
  override readonly artworks = artworks
  override readonly defaultRoom = 'cell'
  override readonly id = 'sandbox'
  /** what stands on the Cell’s pedestals, one each, in their order: the items `?item` names */
  readonly items: ReadonlyArray<SandboxItem>
  override readonly Minimap = minimap
  // Artworks hang on any of the Cell’s walls, and lost ones return to the spawn.
  override readonly placement: FloorPlanPlacementSpace
  override readonly Scene = scene
  // No voxel indirect light: the Cell is lit by its own lamps alone.
  override readonly voxelIndirectLight = false

  /** @param itemIds the object ids of the items on the Cell’s pedestals, a repeated one for each further item of its kind, those `?item` names by default */
  constructor(itemIds: ReadonlyArray<string> = readItems()) {
    const items = resolveItems(itemIds)
    super(worlds.sandbox, [[new Cell(new CellLayout(items.length)), [0, 0, 0]]])
    this.items = items
    const cell = this.room('cell')
    const [x, , z] = this.spawn.position
    this.placement = new FloorPlanPlacementSpace(this.walls, (pointX, pointZ) => cell.room.floorContains(cell.toLocal([pointX, 0, pointZ])), cell.height, [x, 1, z], position => this.floorHeight(position))
  }

  /** Anywhere on the floor of the Cell or the spaces beyond its north wall a body fits, from the floor up to the ceiling. */
  override contains(position: Vec3) {
    const cell = this.room('cell')
    const [, y] = position
    return y >= this.floorHeight(position) - 0.2 && y < cell.height && cell.room.floorContains(cell.toLocal(position), bodyRadius)
  }

  /** The Cell’s floor: level in its hall, down a ramp through the arch in its north wall and sunken a little in the round spaces beyond. */
  override floorHeight(position: Vec3) {
    const cell = this.room('cell')
    return cell.toWorld([0, cell.room.floorHeight(cell.toLocal(position)), 0])[1]
  }

  /** How far a ray from the origin travels until it meets a wall, a little farther than the wall itself, and on through the arches. */
  override wallDistance(origin: Vec3, direction: Vec3) {
    const hit = this.placement.findPlacement(origin, direction, 0, 0, [])
    return hit ? Math.hypot(...hit.position.map((value, index) => value - origin[index]) as Vec3) + 0.3 : Infinity
  }
}

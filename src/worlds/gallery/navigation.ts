import type {Vec3} from '#src/lib/gallery/types.ts'
import type PlacedRoom from '../base/PlacedRoom.ts'
import type {GalleryRoom} from './SlopGallery.ts'

import {corridorPassage, corridorStairFloor, insideCorridor} from '#src/lib/gallery/corridor.ts'
import {fortressFloor, insideFortress} from '#src/lib/gallery/fortress.ts'
import {insideLodgeWindow, lodgeBayFloor, lodgeWindowFloor} from '#src/lib/gallery/lodge.ts'
import lowerGallery, {rampFloorHeight, tunnelFloorHeight} from '#src/lib/gallery/lowerGallery.ts'
import {craterTerrain} from '#src/lib/gallery/moonfall/CraterTerrain.ts'
import {insideApse, platformFloorHeight} from '#src/lib/gallery/oculusApse.ts'
import {balconyFloorHeight} from '#src/lib/gallery/oculusBalcony.ts'
import {towerFloorHeight} from '#src/lib/gallery/oculusTower.ts'
import {insideStairway, stairFloorHeight} from '#src/lib/gallery/staircase.ts'
import {displayFloorHeight, insideTunnelDisplay} from '#src/lib/gallery/tunnelDisplays.ts'

type Hall = PlacedRoom<GalleryRoom> & {size: NonNullable<GalleryRoom['size']>}

const {tunnel} = lowerGallery
const tunnelContains = ([x, y, z]: Vec3) => Math.abs(x - tunnel.x) <= tunnel.width / 2 && z >= tunnel.northZ && z <= tunnel.southZ && y >= tunnelFloorHeight(z) - 1 && y <= tunnelFloorHeight(z) + tunnel.height
const inPlan = ({center, size}: Hall, x: number, z: number) => Math.abs(x - center[0]) <= size[0] / 2 && Math.abs(z - center[1]) <= size[1] / 2
/** The ground under the point in the room: its floor, or Moonfall’s crater where it dips below. */
const groundOf = (room: Hall, x: number, z: number) => room.floorY + (room.id === 'moonfall' ? craterTerrain.height(x - room.center[0], z - room.center[1]) : 0)

/**
 * How the gallery’s rooms, stairways and passages hold a player or an artwork: where they may be and how high the floor under them lies.
 * Rooms around a rectangular floor plan hold everything over it from a meter under their floor, or Moonfall’s crater, to 20 cm over their highest ceiling; the rest has a shape of its own.
 */
export default class GalleryNavigation {
  private readonly halls: ReadonlyArray<Hall>

  constructor(rooms: ReadonlyArray<PlacedRoom<GalleryRoom>>) {
    this.halls = rooms.filter((room): room is Hall => room.size !== undefined)
  }

  /** Whether the position lies anywhere a player or an artwork may be. */
  contains(position: Vec3) {
    return position.every(Number.isFinite) && (this.halls.some(room => this.hallContains(room, position)) || insideStairway(position) || tunnelContains(position) || insideTunnelDisplay(position) || insideLodgeWindow(position) || insideFortress(position))
  }

  /**
   * The height of the walkable floor under the position: the highest nearby floor below it rather than the first one found, which also catches loose objects slightly below a slab of stacked rooms.
   */
  floorHeight([x, y, z]: Vec3) {
    const floors = [
      ...this.halls.filter(room => inPlan(room, x, z)).map(room => groundOf(room, x, z)),
      fortressFloor(x, z),
      corridorPassage.floorAt(x, z),
      platformFloorHeight(x, z),
      tunnelContains([x, tunnelFloorHeight(z), z]) ? tunnelFloorHeight(z) : undefined,
      lodgeWindowFloor(x, z),
      lodgeBayFloor(x, z),
      corridorStairFloor(x, z),
      balconyFloorHeight(x, z),
      towerFloorHeight(x, z),
      stairFloorHeight(x, z),
      rampFloorHeight(x, z),
      displayFloorHeight(x, z),
    ].filter(height => height !== undefined).toSorted((a, b) => b - a)
    return floors.find(height => y >= height - 1) ?? floors.at(-1) ?? 0
  }

  private hallContains(room: Hall, position: Vec3) {
    if (room.id === 'corridor') {
      return insideCorridor(position)
    }
    const [x, y, z] = position
    const ground = Math.min(room.floorY, groundOf(room, x, z))
    // Up to the top of its main box, the vault’s or the dome’s crown included.
    return y >= ground - 1 && y <= room.air[0].max.y + 0.2 && (inPlan(room, x, z) || room.id === 'lodge' && lodgeBayFloor(x, z) !== undefined || room.id === 'oculus' && insideApse(x, z))
  }
}

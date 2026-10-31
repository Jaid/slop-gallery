import type {RoomMap} from '#src/rooms/index.ts'
import type {Portrait, Vec3} from './types.ts'

import slopGallery from '#src/worlds/gallery/index.ts'

import portraitObjects from './portraitObjects.ts'

type MinimapRoom = (typeof slopGallery.rooms)[number]

const {walls} = slopGallery
/**
 * Whether a position in the room shows on the lower floor of the map: by the room’s floor, unless the floor under it lies in the part of the room that climbs to the floor above; a position outside of every room counts by its own height.
 */
const isLower = (room: MinimapRoom | undefined, position: Vec3) => {
  if (!room) {
    return position[1] < 0
  }
  const {floorY, upperMap} = room
  return floorY < 0 && !(upperMap && slopGallery.floorHeight(position) >= floorY + upperMap.from)
}
/** Whether a position in the room with the id, like the player’s, shows on the lower floor of the map. */
export const isLowerPosition = (id: string, position: Vec3) => isLower(slopGallery.roomById(id), position)
export const minimapHeading = ([x, , z]: Vec3) => Math.atan2(x, -z) * 180 / Math.PI

export function minimapPortrait(portrait: Portrait) {
  const physical = portraitObjects.get(portrait.id)?.body.translation()
  const position: Vec3 = physical ? [physical.x, physical.y, physical.z] : portrait.position
  const wall = portrait.hung ? walls.find(candidate => candidate.id === portrait.wallId) : undefined
  return {
    position,
    lower: isLower(wall ? slopGallery.roomById(wall.room) : slopGallery.roomAt(position), position),
  }
}

/** Every drawing of a room’s floor plan, its own and the part on the floor above where it climbs there, each stitched to the others’ by placing it at the room’s origin. */
export const minimapRooms = slopGallery.rooms.flatMap(room => {
  const {id, center: [x, z], floorY, map, upperMap} = room
  const drawing = (part: RoomMap, lower: boolean) => ({
    id,
    lower,
    frame: part.placedFrame([x, z]),
    markup: part.markup,
    /** how opaque the world draws the room while the player is in the room with the id `current` */
    opacity: (current: string) => slopGallery.mapOpacity(room, current),
    transform: `translate(${x} ${z})`,
  })
  return [map && drawing(map, floorY < 0), upperMap && drawing(upperMap.map, false)].filter(drawn => drawn !== undefined)
})

// Both floors share one frame around every room’s, so they keep one scale and stay aligned.
const frames = minimapRooms.map(room => room.frame)
const minX = Math.min(...frames.map(([x]) => x)) - 3
const minZ = Math.min(...frames.map(([, z]) => z)) - 3
export const minimapViewBox = [minX, minZ, Math.max(...frames.map(([x, , width]) => x + width)) + 3 - minX, Math.max(...frames.map(([, z, , depth]) => z + depth)) + 3 - minZ].join(' ')

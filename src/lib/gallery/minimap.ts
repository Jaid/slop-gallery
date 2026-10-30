import type {Portrait, Vec3} from './types.ts'

import slopGallery from '#src/worlds/gallery/index.ts'

import portraitObjects from './portraitObjects.ts'

const {walls} = slopGallery
/** Whether the room lies on the lower floor; a position outside of every room counts by its own height. */
const isLower = (room: {floorY: number} | undefined, [, y]: Vec3) => (room?.floorY ?? y) < 0
/** Whether the room with the id lies on the lower floor. */
export const isLowerRoom = (id: string) => (slopGallery.roomById(id)?.floorY ?? 0) < 0
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

/** Every room with a floor plan, its drawing stitched to the others’ by placing it at the room’s origin. */
export const minimapRooms = slopGallery.rooms.flatMap(room => {
  const {id, center: [x, z], floorY, map} = room
  return map ? {
    id,
    lower: floorY < 0,
    frame: map.placedFrame([x, z]),
    markup: map.markup,
    /** how opaque the world draws the room while the player is in the room with the id `current` */
    opacity: (current: string) => slopGallery.mapOpacity(room, current),
    transform: `translate(${x} ${z})`,
  } : []
})

// Both floors share one frame around every room’s, so they keep one scale and stay aligned.
const frames = minimapRooms.map(room => room.frame)
const minX = Math.min(...frames.map(([x]) => x)) - 3
const minZ = Math.min(...frames.map(([, z]) => z)) - 3
export const minimapViewBox = [minX, minZ, Math.max(...frames.map(([x, , width]) => x + width)) + 3 - minX, Math.max(...frames.map(([, z, , depth]) => z + depth)) + 3 - minZ].join(' ')

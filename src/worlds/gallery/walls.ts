import type {Wall} from '#src/lib/placement/wallGeometry.ts'
import type {RoomWall} from '#src/rooms/index.ts'

import miterCorners from '#src/lib/gallery/cornerMiters.ts'
import roomOrigins from '#src/lib/gallery/layout.ts'
import antechamber from '#src/rooms/antechamber/walls.ts'
import banquet from '#src/rooms/banquet/walls.ts'
import corridor from '#src/rooms/corridor/walls.ts'
import exhibition from '#src/rooms/exhibition/walls.ts'
import fortress from '#src/rooms/fortress/walls.ts'
import {placeWalls} from '#src/rooms/lib/walls.ts'
import lobby from '#src/rooms/lobby/walls.ts'
import lodge from '#src/rooms/lodge/walls.ts'
import moonfall from '#src/rooms/moonfall/walls.ts'
import oculus from '#src/rooms/oculus/walls.ts'
import salon from '#src/rooms/salon/walls.ts'
import sienna from '#src/rooms/sienna/walls.ts'
import vesper from '#src/rooms/vesper/walls.ts'

/** every room’s walls by its id, in the order the gallery places its rooms */
const roomWalls: ReadonlyArray<readonly [keyof typeof roomOrigins, Record<string, RoomWall>]> = [
  ['lobby', lobby],
  ['vesper', vesper],
  ['banquet', banquet],
  ['antechamber', antechamber],
  ['sienna', sienna],
  ['salon', salon],
  ['moonfall', moonfall],
  ['lodge', lodge],
  ['corridor', corridor],
  ['oculus', oculus],
  ['exhibition', exhibition],
  ['fortress', fortress],
]
/**
 * The gallery’s walls in world meters, room by room, their trim mitered where two walls meet in an inside corner: the gallery world’s `walls`, built from nothing but the rooms’ wall modules and the gallery’s layout.
 * That lets the build bake the architecture cut from them, which it can’t evaluate through the world itself.
 */
const galleryWalls: ReadonlyArray<Wall> = miterCorners(roomWalls.flatMap(([room, walls]) => placeWalls(room, roomOrigins[room], Object.entries(walls))))
export default galleryWalls

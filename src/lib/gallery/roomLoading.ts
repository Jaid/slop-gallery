import type {RoomId} from '#src/rooms/index.ts'

import {trackLoadingItems} from '#src/lib/loadingItems.ts'

/** the rooms the world asked for whose parts haven’t mounted yet */
const pending = new Set<RoomId>
let mounted = 0
trackLoadingItems(() => [...pending].map(room => `room:${room}`))

/** how many rooms the world asked for are still loading or waiting to mount; the loading screen waits for none to be left */
export const pendingRooms = () => pending.size

/** how many rooms have mounted so far, which grows whenever the world gains a room’s geometry */
export const mountedRooms = () => mounted

/** Lists the room as loading until {@link endRoom} ends it. */
export function startRoom(room: RoomId) {
  pending.add(room)
}

/** Ends the room’s loading, counting it as mounted unless it failed. */
export function endRoom(room: RoomId, failed = false) {
  if (pending.delete(room) && !failed) {
    mounted++
  }
}

/** Forgets every room still loading, once the world unmounts. */
export function clearRooms() {
  pending.clear()
}

import type {CameraBookmark, SpawnBookmark, Vec3} from './types.ts'

import {Euler, Quaternion} from 'three/webgpu'

import {cameraBookmarks, spawnBookmarks} from '#level/bookmarks.ts'
import {levelFloorHeight} from '#level/navigation.ts'

import {galleryEvents, notify} from './actions.ts'
import {playerSession} from './PlayerSession.ts'
import {readSpawn} from './spawn.ts'

export {readSpawn} from './spawn.ts'

/** key that teleports the player to the next bookmark with `?development`, or to the previous one with Shift */
export const bookmarkKey = 'KeyT'

/** how close the player’s feet must be to a bookmark to count as standing in it, in meters */
export const bookmarkRadius = 1

/** The spawn bookmark `?spawn` names, `null` without `?spawn` and `undefined` when this level has no spawn bookmark with that ID. */
export function findSpawnBookmark(input?: URL | string, list: ReadonlyArray<SpawnBookmark> = spawnBookmarks): SpawnBookmark | null | undefined {
  const id = readSpawn(input)
  return id ? list.find(bookmark => bookmark.id === id) : null
}

/** The camera bookmark `?spawn` names, `null` without `?spawn` and `undefined` when this level has no camera bookmark with that ID. */
export function findCameraBookmark(input?: URL | string, list: ReadonlyArray<CameraBookmark> = cameraBookmarks): CameraBookmark | null | undefined {
  const id = readSpawn(input)
  return id ? list.find(bookmark => bookmark.id === id) : null
}

/** Where the player stands below a camera bookmark: a standing eye height under the camera, but never below the floor. */
export function cameraBookmarkFeet({position}: CameraBookmark): Vec3 {
  return [position[0], Math.max(levelFloorHeight(position) + 0.04, position[1] - 1.6), position[2]]
}

/** Move the player session to the `?spawn` bookmark, overriding any saved position; for a camera bookmark, below it. */
export function applySpawnBookmark() {
  const spawnBookmark = findSpawnBookmark()
  if (spawnBookmark) {
    playerSession.restore(spawnBookmark)
    return
  }
  const cameraBookmark = findCameraBookmark()
  if (cameraBookmark) {
    playerSession.restore({
      position: cameraBookmarkFeet(cameraBookmark),
      ...cameraBookmark.aim,
    })
  } else if (cameraBookmark === undefined) {
    notify(`This level has no bookmark “${readSpawn()}”.`)
  }
}

/** Pick the bookmark to teleport to from feet position `position`: the one after (or with `backward`, before) the bookmark the player stands in, or else the closest one. */
export function nextBookmark(position: Vec3, list: ReadonlyArray<SpawnBookmark>, backward = false): number | null {
  if (!list.length) {
    return null
  }
  const distances = list.map(bookmark => Math.hypot(bookmark.position[0] - position[0], bookmark.position[1] - position[1], bookmark.position[2] - position[2]))
  const closest = distances.indexOf(Math.min(...distances))
  // Cycling through the list from the current bookmark reaches every one, while “closest other” could bounce between two neighbors forever.
  return distances[closest] <= bookmarkRadius ? (closest + (backward ? list.length - 1 : 1)) % list.length : closest
}

/** Teleport the player to the next (or with `backward`, previous) of the current level’s spawn bookmarks, see `nextBookmark`. */
export function teleportToNextBookmark(backward = false) {
  const index = nextBookmark(playerSession.snapshot().position, spawnBookmarks, backward)
  if (index === null) {
    notify('This level has no spawn bookmarks.')
    return
  }
  const {id, position, yaw, pitch} = spawnBookmarks[index]
  const rotation = new Quaternion
  galleryEvents.dispatchEvent(new CustomEvent('teleport', {
    detail: {
      feet: true,
      position: [...position],
      rotation: rotation.setFromEuler(new Euler(pitch, yaw, 0, 'YXZ')).toArray(),
    },
  }))
  notify(`Bookmark ${index + 1} of ${spawnBookmarks.length}: ${id}`)
}

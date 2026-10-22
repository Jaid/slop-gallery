import type {PlayerPose, Vec3} from './types.ts'

import {Euler, Quaternion} from 'three/webgpu'

import {bookmarks} from '#level/navigation.ts'

import {galleryEvents, notify} from './actions.ts'
import {playerSession} from './PlayerSession.ts'

/** key that teleports the player to the next bookmark with `?development` */
export const bookmarkKey = 'KeyT'

/** how close the player’s feet must be to a bookmark to count as standing in it, in meters */
export const bookmarkRadius = 1

/** Pick the bookmark to teleport to from feet position `position`: the one after the bookmark the player stands in, or else the closest one. */
export function nextBookmark(position: Vec3, list: ReadonlyArray<PlayerPose> = bookmarks): number | null {
  if (!list.length) {
    return null
  }
  const distances = list.map(bookmark => Math.hypot(bookmark.position[0] - position[0], bookmark.position[1] - position[1], bookmark.position[2] - position[2]))
  const closest = distances.indexOf(Math.min(...distances))
  // Cycling through the list from the current bookmark reaches every one, while “closest other” could bounce between two neighbors forever.
  return distances[closest] <= bookmarkRadius ? (closest + 1) % list.length : closest
}

/** Teleport the player to the next bookmark of the current level, see `nextBookmark`. */
export function teleportToNextBookmark() {
  const index = nextBookmark(playerSession.snapshot().position)
  if (index === null) {
    notify('This level has no bookmarks.')
    return
  }
  const {position, yaw, pitch} = bookmarks[index]
  const rotation = new Quaternion
  galleryEvents.dispatchEvent(new CustomEvent('teleport', {
    detail: {
      feet: true,
      position: [...position],
      rotation: rotation.setFromEuler(new Euler(pitch, yaw, 0, 'YXZ')).toArray(),
    },
  }))
  notify(`Bookmark ${index + 1} of ${bookmarks.length}.`)
}

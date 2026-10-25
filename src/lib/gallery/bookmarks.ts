import type {CameraBookmark, SpawnBookmark, Vec3} from './types.ts'

import optis from 'optis'
import readPermalink from 'read-permalink'
import {Euler, Quaternion} from 'three/webgpu'

import {cameraBookmarks, spawnBookmarks} from '#level/bookmarks.ts'

import {galleryEvents, notify} from './actions.ts'
import {playerSession} from './PlayerSession.ts'

/** key that teleports the player to the next bookmark with `?development`, or to the previous one with Shift */
export const bookmarkKey = 'KeyT'

/** how close the player’s feet must be to a bookmark to count as standing in it, in meters */
export const bookmarkRadius = 1

const spawnSchema = optis({
  defaults: {
    spawn: '',
  },
  normalizations: {
    spawn(value: unknown) {
      return typeof value === 'string' ? value : ''
    },
  },
})

/** Read the `?spawn` bookmark ID the session starts at, or an empty string. */
export function readSpawn(input: URL | string = typeof location === 'undefined' ? '' : location.href): string {
  return readPermalink(input, {schema: spawnSchema}).spawn
}

/** The spawn or camera bookmark `?spawn` names, `null` without `?spawn` and `undefined` when this level has no bookmark with that ID. */
export function findSpawnBookmark(input?: URL | string, list: ReadonlyArray<CameraBookmark> = [...spawnBookmarks, ...cameraBookmarks]): CameraBookmark | null | undefined {
  const id = readSpawn(input)
  return id ? list.find(bookmark => bookmark.id === id) : null
}

/** Move the player session to the `?spawn` bookmark, overriding any saved position. */
export function applySpawnBookmark() {
  const bookmark = findSpawnBookmark()
  if (bookmark === undefined) {
    notify(`This level has no bookmark “${readSpawn()}”.`)
  } else if (bookmark) {
    playerSession.restore(bookmark)
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

import optis from 'optis'
import readPermalink, {parseNumber} from 'read-permalink'

import {cameraBookmarks} from '#level/bookmarks.ts'

import {readSpawn} from './gallery/spawn.ts'

declare global {
  /** set while `?frozen_time` holds the clock; `reached` turns true once the clock stands at the requested time */
  var frozenTime: {
    reached: boolean
    seconds: number
  } | undefined
}
const frozenTimeSchema = optis({
  normalizations: {
    frozen_time(value: unknown) {
      try {
        const seconds = parseNumber(value)
        if (seconds >= 0) {
          return seconds
        }
      } catch {
      }
    },
  },
})
// Animation steps stay this short, so physics and effects that integrate over time do not jump.
const step = 1 / 30

/** Read the optional `?frozen_time` from the permalink, or else the `frozenTime` of the `?spawn` camera bookmark: the engine time in seconds that every animation stands still at, so captures of the same view match. */
export function readFrozenTime(input: URL | string = typeof location === 'undefined' ? '' : location.href): number | undefined {
  const spawn = readSpawn(input)
  return readPermalink(input, {schema: frozenTimeSchema}).frozen_time ?? (spawn ? cameraBookmarks.find(bookmark => bookmark.id === spawn)?.frozenTime : undefined)
}

/**
 * Takes over performance.now() and requestAnimationFrame() before the engine reads them. Frames keep coming while the scene loads, but time stands still at 0.
 * Once the scene is ready and its artworks and pipelines are loaded, time advances to the requested seconds in short, equal steps and stands still again.
 * Everything that animates reads one of the two, so fire, water, physics and shaders all freeze at the same moment in every run.
 */
const freezeTime = (seconds: number) => {
  const realRequestAnimationFrame = globalThis.requestAnimationFrame.bind(globalThis)
  const state = {
    reached: false,
    seconds,
  }
  globalThis.frozenTime = state
  let now = 0
  let nextId = 1
  let pumping = false
  let queue = new Map<number, FrameRequestCallback>
  const flush = () => {
    const callbacks = queue
    queue = new Map
    for (const callback of callbacks.values()) {
      try {
        callback(now)
      } catch (error) {
        reportError(error)
      }
    }
  }
  Object.defineProperty(performance, 'now', {
    configurable: true,
    value: () => now,
  })
  globalThis.requestAnimationFrame = callback => {
    const id = nextId++
    queue.set(id, callback)
    if (!pumping) {
      pumping = true
      realRequestAnimationFrame(() => {
        pumping = false
        flush()
      })
    }
    return id
  }
  globalThis.cancelAnimationFrame = id => {
    queue.delete(id)
  }
  const isLoaded = () => {
    const snapshot = globalThis.slopGallery?.snapshot?.()
    return Boolean(snapshot?.ready && snapshot.pendingImages === 0 && snapshot.pendingPipelines === 0)
  }
  const advance = async () => {
    while (!isLoaded()) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    const count = Math.ceil(seconds / step)
    for (let index = 0; index < count; index++) {
      now += seconds / count * 1000
      flush()
      // Lets the GPU and background loading catch up between steps.
      await new Promise(resolve => setTimeout(resolve))
    }
    state.reached = true
  }
  advance().catch(reportError)
}
const requestedSeconds = readFrozenTime()
if (requestedSeconds !== undefined) {
  freezeTime(requestedSeconds)
}

import optis from 'optis'
import readPermalink from 'read-permalink'

/**
 * How the scene loads behind the loading screen:
 * `full` builds every object for every pass before Enter unlocks, `streamed` only what the start view sees and then the rest a few objects per frame, nearest rooms first,
 * and `lazy` streams only the rooms related to the player’s current room, following the player from room to room.
 */
export type LoadingMode = 'full' | 'lazy' | 'streamed'

const modes = new Set<unknown>(['full', 'lazy', 'streamed'])
const schema = optis({
  defaults: {
    loading: 'full',
  },
  normalizations: {
    loading(value: unknown): LoadingMode {
      return modes.has(value) ? value as LoadingMode : 'full'
    },
  },
})

/** Read `?loading`, `full` by default. */
export function readLoading(input: URL | string = typeof location === 'undefined' ? '' : location.href): LoadingMode {
  return readPermalink(input, {schema}).loading
}

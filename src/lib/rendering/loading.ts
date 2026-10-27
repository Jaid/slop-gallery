import optis from 'optis'
import readPermalink from 'read-permalink'

/**
 * How the scene loads behind the loading screen:
 * `stream`, the default, builds only what the start view sees before Enter unlocks and then the rest a few objects per frame, nearest rooms first, `full` builds every object for every pass before Enter unlocks,
 * and `lazy` streams only the rooms related to the player’s current room, following the player from room to room.
 * With `stream` and `lazy`, the gallery’s rooms other than the Lobby and the start room also only download once Enter is enabled.
 */
export type LoadingMode = 'full' | 'lazy' | 'stream'

const modes = new Set<unknown>(['full', 'lazy', 'stream'])
const schema = optis({
  defaults: {
    loading: 'stream',
  },
  normalizations: {
    loading(value: unknown): LoadingMode {
      return modes.has(value) ? value as LoadingMode : 'stream'
    },
  },
})

/** Read `?loading`, `stream` by default. */
export function readLoading(input: URL | string = typeof location === 'undefined' ? '' : location.href): LoadingMode {
  return readPermalink(input, {schema}).loading
}

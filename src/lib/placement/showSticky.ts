import optis from 'optis'
import readPermalink from 'read-permalink'

const enabledValues = new Set<unknown>([true, '', 'true'])
const showStickySchema = optis({
  defaults: {
    show_sticky: false,
  },
  normalizations: {
    show_sticky(value: unknown) {
      return enabledValues.has(value)
    },
  },
})

/** Read the `?show_sticky` flag that highlights every surface artworks can hang on; a bare `?show_sticky` counts as enabled. */
export function readShowSticky(input: URL | string = typeof location === 'undefined' ? '' : location.href): boolean {
  return readPermalink(input, {schema: showStickySchema}).show_sticky
}

/** whether this page was opened with `?show_sticky`, read once at startup */
export const isShowingSticky = readShowSticky()

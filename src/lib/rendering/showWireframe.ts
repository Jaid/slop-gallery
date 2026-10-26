import optis from 'optis'
import readPermalink from 'read-permalink'

const enabledValues = new Set<unknown>([true, '', 'true'])
const showWireframeSchema = optis({
  defaults: {
    show_wireframe: false,
  },
  normalizations: {
    show_wireframe(value: unknown) {
      return enabledValues.has(value)
    },
  },
})

/** Read the `?show_wireframe` flag that renders the scene as wireframe instead of its regular look; a bare `?show_wireframe` counts as enabled. */
export function readShowWireframe(input: URL | string = typeof location === 'undefined' ? '' : location.href): boolean {
  return readPermalink(input, {schema: showWireframeSchema}).show_wireframe
}

/** whether this page was opened with `?show_wireframe`, read once at startup */
export const isShowingWireframe = readShowWireframe()

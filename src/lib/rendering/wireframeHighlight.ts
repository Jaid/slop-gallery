import {normalizeMeshPath} from 'capture-session'
import optis from 'optis'
import readPermalink from 'read-permalink'

const wireframeHighlightSchema = optis({
  normalizations: {
    wireframe_highlight: normalizeMeshPath,
  },
})

/** Read an optional mesh path whose wireframe stands out from the rest of the scene, like `lobby-fountain` or `lobby-fountain/fountain-falling-water`. */
export function readWireframeHighlight(input: URL | string = typeof location === 'undefined' ? '' : location.href): string | undefined {
  return readPermalink(input, {schema: wireframeHighlightSchema}).wireframe_highlight
}

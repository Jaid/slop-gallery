import type {BakeOptions} from 'vite-plugin-bake-core'

import createBakePlugin from 'vite-plugin-bake-core'
import {threeAdapter} from 'vite-plugin-bake-core/three'

export type BakeThreeGeometryOptions = BakeOptions

/** Automatically replace closed geometry-producing expressions; no decorators or wrappers. */
export default function bakeThreeGeometry(options: BakeThreeGeometryOptions = {}) {
  return createBakePlugin(threeAdapter({
    name: 'three-geometry',
    kind: 'geometry',
  }), {
    minimumBytes: 32 * 1024,
    ...options,
  })
}

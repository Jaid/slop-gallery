import type {BakeOptions} from 'vite-plugin-bake-core'

import createBakePlugin from 'vite-plugin-bake-core'
import {threeAdapter} from 'vite-plugin-bake-core/three'

import {withMeshBvh} from './meshBvh.ts'

export type BakeThreeGeometryOptions = BakeOptions & {meshBvh?: boolean}

/** Automatically replace closed geometry-producing expressions; no decorators or wrappers. */
export default function bakeThreeGeometry(options: BakeThreeGeometryOptions = {}) {
  const {meshBvh = true, ...bakeOptions} = options
  const adapter = threeAdapter({
    name: 'three-geometry',
    kind: 'geometry',
  })
  return createBakePlugin(meshBvh ? withMeshBvh(adapter) : adapter, {
    minimumBytes: 32 * 1024,
    ...bakeOptions,
  })
}

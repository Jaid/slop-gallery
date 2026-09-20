import type {BufferGeometry} from 'three/webgpu'
import type {RuntimeCodec} from 'vite-plugin-bake-core/runtime'

import {MeshBVH} from 'three-mesh-bvh'

type BvhData = {
  geometry: BufferGeometry
  tree: ReturnType<typeof MeshBVH.serialize>
}

/** The geometry is a graph reference, never an independently selected lookup key. */
export const meshBvhCodec: RuntimeCodec = {
  allocate: () => Object.create(MeshBVH.prototype) as MeshBVH,
  hydrate(target, data) {
    const {geometry, tree} = data as BvhData
    const restored = MeshBVH.deserialize(tree, geometry, {setIndex: false})
    Object.assign(target, restored)
    // deserialize creates an instance-owned arrow closure. Rebind that one closure to
    // the graph placeholder so future refit/init operations still use its current data.
    // This is the only internal-layout dependency, covered by direct/indirect/refit tests.
    const bvh = target as MeshBVH & {_indirectBuffer: Uint16Array | Uint32Array | null}
    Object.defineProperty(bvh, 'resolvePrimitiveIndex', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: (index: number) => (bvh._indirectBuffer ? bvh._indirectBuffer[index] : index),
    })
  },
}

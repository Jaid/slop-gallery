import type {BakeAdapter, SnapshotCodec} from 'vite-plugin-bake-core'

import {fileURLToPath} from 'node:url'

import {NotBakeableError} from 'vite-plugin-bake-core'

import {bvhCandidates} from './bvhCandidates.ts'

/** Optional dependency: no module import or runtime codec unless the source actually uses MeshBVH. */
export function withMeshBvh(base: BakeAdapter): BakeAdapter {
  const roots = new Set(base.roots)
  const codecs: Array<SnapshotCodec> = [...base.codecs ?? []]
  let capability: Promise<Readonly<Record<string, unknown>>> | undefined
  return {
    ...base,
    roots,
    codecs,
    candidates: bvhCandidates,
    accepts: resources => base.accepts(resources) || resources.has('mesh-bvh'),
    async loadModule(source) {
      if (source !== 'three-mesh-bvh') {
        return base.loadModule?.(source)
      }
      capability ??= import('three-mesh-bvh').then(({MeshBVH, CENTER, AVERAGE, SAH}) => {
        // Reject callbacks and shared memory even when they are supplied indirectly.
        const Constructor = new Proxy(MeshBVH, {
          construct(target, args) {
            const options = args[1] as {
              onProgress?: unknown
              useSharedArrayBuffer?: boolean
            } | undefined
            if (options?.onProgress || options?.useSharedArrayBuffer) {
              throw new NotBakeableError('MeshBVH callbacks and shared buffers stay at runtime.')
            }
            return Reflect.construct(target, args)
          },
        })
        roots.add(Constructor)
        codecs.push({
          name: 'mesh-bvh',
          module: fileURLToPath(new URL('bvhRuntime.ts', import.meta.url)).replaceAll('\\', '/'),
          exportName: 'meshBvhCodec',
          resource: 'mesh-bvh',
          test: value => Object.getPrototypeOf(value) === MeshBVH.prototype,
          encode(value) {
            const tree = value as InstanceType<typeof MeshBVH>
            if (Object.keys(tree).some(key => !['_indirectBuffer', '_roots', 'geometry', 'resolvePrimitiveIndex'].includes(key))) {
              throw new NotBakeableError('Custom MeshBVH instance fields are not supported.')
            }
            return {
              geometry: tree.geometry,
              tree: MeshBVH.serialize(tree, {cloneBuffers: false}),
            }
          },
        })
        return {
          MeshBVH: Constructor,
          CENTER,
          AVERAGE,
          SAH,
        }
      })
      return capability
    },
  }
}

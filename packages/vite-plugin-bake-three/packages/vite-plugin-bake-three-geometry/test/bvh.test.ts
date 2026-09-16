import type {Constructors} from 'vite-plugin-bake-core/runtime'

import {expect, test} from 'bun:test'

import {MeshBVH, SAH} from 'three-mesh-bvh'
import * as Three from 'three/webgpu'
import {SnapshotWriter} from 'vite-plugin-bake-core'
import {decodeSnapshot} from 'vite-plugin-bake-core/runtime'
import {threeAdapter} from 'vite-plugin-bake-core/three'

import {meshBvhCodec} from '../src/bvhRuntime.ts'
import {withMeshBvh} from '../src/meshBvh.ts'

async function roundTrip(value: unknown) {
  const adapter = withMeshBvh(threeAdapter({
    name: 'test',
    kind: 'geometry',
  }))
  await adapter.loadModule!('three-mesh-bvh')
  const writer = new SnapshotWriter(adapter, 32 * 1024 * 1024, () => false)
  const bytes = writer.write(value)
  expect([...writer.resources]).toContain('mesh-bvh')
  return decodeSnapshot(bytes, Three as unknown as Constructors, {'mesh-bvh': meshBvhCodec})
}
function hits(tree: MeshBVH) {
  return Array.from({length: 32}, (_, index) => {
    const angle = index * Math.PI * 2 / 32
    const origin = new Three.Vector3(Math.sin(angle) * 2, Math.cos(angle) * 2, 1)
    return tree.raycastFirst(new Three.Ray(origin, origin.clone().negate().normalize()), Three.DoubleSide)
  })
}
test.each([false, true])('BVH round-trip preserves geometry/index pairing, cycles and raycasts (indirect=%s)', async indirect => {
  const geometry = new Three.TorusKnotGeometry(0.45, 0.13, 48, 16)
  const originalIndex = Uint16Array.from(geometry.index!.array)
  const tree = new MeshBVH(geometry, {
    indirect,
    strategy: SAH,
    setBoundingBox: false,
    targetLeafSize: 4,
  })
  geometry.boundsTree = tree
  const create = await roundTrip({
    geometry,
    tree,
    again: tree,
  })
  const first = create() as {
    again: MeshBVH
    geometry: Three.BufferGeometry
    tree: MeshBVH
  }
  const second = create() as typeof first
  expect(first.tree).toBeInstanceOf(MeshBVH)
  expect(first.geometry.boundsTree).toBe(first.tree)
  expect(first.tree).toBe(first.again)
  expect(first.tree.geometry).toBe(first.geometry)
  expect(first.tree.indirect).toBe(indirect)
  expect(first.geometry.boundingBox).toBeNull()
  expect(first.geometry.index!.array).toEqual(geometry.index!.array)
  if (indirect) {
    expect(first.geometry.index!.array).toEqual(originalIndex)
  }
  expect(hits(first.tree)).toEqual(hits(tree))
  expect(first.tree).not.toBe(second.tree)
  expect(first.geometry.index!.array.buffer).not.toBe(second.geometry.index!.array.buffer)
  const a = MeshBVH.serialize(first.tree, {cloneBuffers: false})
  const b = MeshBVH.serialize(second.tree, {cloneBuffers: false})
  expect(a.roots).toEqual(b.roots)
  expect(a.roots[0]).not.toBe(b.roots[0])
  expect(a.index === first.geometry.index!.array).toBe(true)
  first.geometry.translate(0.25, 0.2, 0)
  geometry.translate(0.25, 0.2, 0)
  first.tree.refit()
  tree.refit()
  expect(hits(first.tree)).toEqual(hits(tree))
  expect(hits(second.tree)).not.toEqual(hits(first.tree))
  for (const index of [0, 1, 100]) {
    expect(first.tree.resolveTriangleIndex(index)).toBe(tree.resolveTriangleIndex(index))
  }
})
test('BVH preserves non-indexed indirect geometry, groups and explicit draw ranges', async () => {
  const geometry = new Three.BoxGeometry(1, 1, 1, 2, 2, 2).toNonIndexed()
  geometry.setDrawRange(6, 48)
  const tree = new MeshBVH(geometry, {
    indirect: true,
    setBoundingBox: true,
  })
  const create = await roundTrip(tree)
  const restored = create() as MeshBVH
  expect(restored.geometry.index).toBeNull()
  expect(restored.geometry.groups).toEqual(geometry.groups)
  expect(restored.geometry.drawRange).toEqual(geometry.drawRange)
  expect(restored.geometry.boundingBox).toEqual(geometry.boundingBox)
  expect(hits(restored)).toEqual(hits(tree))
})
test('optional BVH support does not load or require a codec for unrelated geometry', async () => {
  const adapter = withMeshBvh(threeAdapter({
    name: 'test',
    kind: 'geometry',
  }))
  expect(adapter.codecs).toHaveLength(0)
  const writer = new SnapshotWriter(adapter, 1024 * 1024, () => false)
  writer.write(new Three.BoxGeometry(1, 1, 1))
  expect(writer.codecs.size).toBe(0)
})

import type {BufferGeometry} from 'three/webgpu'
import type {Constructors} from 'vite-plugin-bake-core/runtime'

import {expect, test} from 'bun:test'
import {resolve} from 'node:path'

import * as Three from 'three/webgpu'
import {Recipe, SnapshotWriter, SourceGraph} from 'vite-plugin-bake-core'
import {decodeSnapshot} from 'vite-plugin-bake-core/runtime'
import {threeAdapter} from 'vite-plugin-bake-core/three'

const constructors = Three as unknown as Constructors
const adapter = threeAdapter({
  name: 'geometry-test',
  kind: 'geometry',
})
function bake(value: unknown, rootPrototype?: object) {
  const writer = new SnapshotWriter(adapter, 32 * 1024 * 1024, () => false, rootPrototype)
  return {
    create: decodeSnapshot(writer.write(value), constructors),
    writer,
  }
}
function sameGeometry(actual: BufferGeometry, expected: BufferGeometry) {
  expect(actual.type).toBe(expected.type)
  expect(actual.index?.array).toEqual(expected.index?.array)
  expect(actual.groups).toEqual(expected.groups)
  expect(actual.drawRange).toEqual(expected.drawRange)
  expect(actual.boundingBox).toEqual(expected.boundingBox)
  expect(actual.boundingSphere).toEqual(expected.boundingSphere)
  expect(actual.userData).toEqual(expected.userData)
  for (const [name, attribute] of Object.entries(expected.attributes)) {
    const restored = actual.attributes[name]
    expect(restored.array).toEqual(attribute.array)
    expect(restored.itemSize).toBe(attribute.itemSize)
    expect(restored.normalized).toBe(attribute.normalized)
    expect(restored.constructor).toBe(attribute.constructor)
  }
}
test('stores final transformed geometry, tangents, bounds, groups and native prototypes', () => {
  const geometry = new Three.BoxGeometry(2, 3, 4, 3, 4, 5).rotateY(0.4).translate(3, -2, 5)
  geometry.computeTangents()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.setDrawRange(3, 24)
  geometry.userData = {label: 'baked box'}
  const {create} = bake(geometry)
  const first = create() as Three.BoxGeometry
  const second = create() as Three.BoxGeometry
  expect(first).toBeInstanceOf(Three.BoxGeometry)
  expect(first.parameters).toEqual(geometry.parameters)
  sameGeometry(first, geometry)
  sameGeometry(second, geometry)
  expect(first.id).not.toBe(second.id)
  expect(first.uuid).not.toBe(second.uuid)
  expect((first.attributes.position as Three.BufferAttribute).id).not.toBe((second.attributes.position as Three.BufferAttribute).id)
  expect(first.attributes.position.array.buffer).not.toBe(second.attributes.position.array.buffer)
  first.attributes.position.setX(0, 1000)
  expect(second.attributes.position.getX(0)).not.toBe(1000)
  expect(first.clone()).toBeInstanceOf(Three.BoxGeometry)
})
test('preserves interleaved attributes, instancing and morph targets', () => {
  const geometry = new Three.BufferGeometry
  const data = new Three.InterleavedBuffer(new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), 6)
  geometry.setAttribute('position', new Three.InterleavedBufferAttribute(data, 3, 0))
  geometry.setAttribute('normal', new Three.InterleavedBufferAttribute(data, 3, 3))
  geometry.setAttribute('color', new Three.InstancedBufferAttribute(new Uint8Array([128, 64, 32, 255, 0, 128]), 3, true, 2))
  geometry.morphAttributes.position = [new Three.Float32BufferAttribute([2, 2, 2, 3, 3, 3], 3)]
  geometry.morphTargetsRelative = true
  const {create} = bake(geometry)
  const result = create() as Three.BufferGeometry
  sameGeometry(result, geometry)
  const position = result.attributes.position as Three.InterleavedBufferAttribute
  const normal = result.attributes.normal as Three.InterleavedBufferAttribute
  expect(position.data).toBe(normal.data)
  expect(position.getX(1)).toBe(7)
  expect(normal.getZ(1)).toBe(12)
  expect((result.attributes.color as Three.InstancedBufferAttribute).meshPerAttribute).toBe(2)
  expect(result.morphAttributes.position![0].array).toEqual(geometry.morphAttributes.position[0].array)
  expect(result.morphTargetsRelative).toBe(true)
})
test('supports owned collision arrays alongside render geometry', () => {
  const geometry = new Three.TorusKnotGeometry(0.45, 0.13, 64, 16)
  geometry.computeTangents()
  const value = {
    geometry,
    same: geometry,
    collision: [Float32Array.from(geometry.attributes.position.array), Uint32Array.from(geometry.index!.array)],
  }
  const {create} = bake(value)
  const result = create() as typeof value
  sameGeometry(result.geometry, geometry)
  expect(result.same).toBe(result.geometry)
  expect(result.collision).toEqual(value.collision)
})
test('recognizes arbitrary class names and retains custom disposal methods without rerunning constructors', async () => {
  const graph = new SourceGraph(async () => {})
  const source = await graph.input(resolve('specimen.ts'), `
    import {BoxGeometry} from 'three/webgpu'
    class Specimen {
      geometry = new BoxGeometry(2, 3, 4)
      constructor() { this.geometry.translate(5, 6, 7) }
      dispose() { this.geometry.dispose() }
    }
    const result = new Specimen
  `)
  const path = source.path.scope.getBinding('result')!.path.get('init')
  if (Array.isArray(path) || !path.isNewExpression()) { throw new Error('Expected constructor initializer') }
  const evaluated = await new Recipe(graph, adapter).evaluate(path, 1000)
  const writer = new SnapshotWriter(adapter, 1024 * 1024, evaluated.isShared, evaluated.rootPrototype)
  const create = decodeSnapshot(writer.write(evaluated.value), constructors)
  class RuntimeSpecimen {
    geometry!: Three.BoxGeometry
    constructor() {
      throw new Error('Constructor must not run during hydration')
    }
    dispose() {
      this.geometry.dispose()
    }
  }
  const restored = create(RuntimeSpecimen) as RuntimeSpecimen
  let disposed = false
  restored.geometry.addEventListener('dispose', () => {
    disposed = true
  })
  expect(restored).toBeInstanceOf(RuntimeSpecimen)
  restored.dispose()
  expect(disposed).toBe(true)
})
test('does not bake data derived from native resource identity', async () => {
  const graph = new SourceGraph(async () => {})
  const source = await graph.input(resolve('identity.ts'), 'import {BoxGeometry} from \'three/webgpu\'; const result = (() => {const geometry = new BoxGeometry(1, 2, 3); return {geometry, key: geometry.uuid}})()')
  const path = source.path.scope.getBinding('result')!.path.get('init')
  if (Array.isArray(path) || !path.isCallExpression()) {
    throw new Error('Expected call initializer')
  }
  await expect(new Recipe(graph, adapter).evaluate(path, 1000)).rejects.toThrow('identity')
})

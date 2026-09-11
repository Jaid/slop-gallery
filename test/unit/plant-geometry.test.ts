import type {BufferGeometry} from 'three/webgpu'

import {describe, expect, test} from 'bun:test'

import {BoxGeometry, Float32BufferAttribute, PlaneGeometry} from 'three/webgpu'

import sampleGrid from '../../src/lib/gallery/plantDecorations/geometry.ts'
import PlantGeometry from '../../src/lib/gallery/plantDecorations/PlantGeometry.ts'
import {mergeParts, triangleCount} from '../../src/lib/geometry.ts'

function connectedParts(geometry: BufferGeometry) {
  const parents = Array.from({length: geometry.getAttribute('position').count}, (_, i) => i)
  const root = (vertex: number): number => {
    let current = vertex
    while (parents[current] !== current) {
      parents[current] = parents[parents[current]]!
      current = parents[current]!
    }
    return current
  }
  const indices = geometry.index!.array
  for (let i = 0; i < indices.length; i += 3) {
    const a = root(indices[i])
    parents[root(indices[i + 1])] = a
    parents[root(indices[i + 2])] = a
  }
  return new Set([...indices].map(root)).size
}
describe('botanical mesh efficiency', () => {
  test.each([
    ['philodendron', 11, 11, 5500, 1_862_784],
    ['fig', 13, 14, 4200, 1_236_096],
    ['palm', 182, 7, 7600, 2_467_584],
    ['snake', 15, 15, 4600, 1_313_280],
    ['rubber', 13, 13, 2700, 1_080_576],
    ['calathea', 13, 13, 6500, 1_213_056],
    ['fern', 450, 15, 18_100, 6_048_000],
    ['jade', 49, 8, 9800, 2_420_736],
  ] as const)('%s retains every leaf and branch within its geometry budget', (kind, leaves, branches, budget, originalBytes) => {
    const geometry = new PlantGeometry(kind)
    try {
      expect(connectedParts(geometry.foliage)).toBe(leaves)
      expect(connectedParts(geometry.stems)).toBe(branches)
      expect(triangleCount(geometry.foliage) + triangleCount(geometry.stems)).toBeLessThanOrEqual(budget)
      let bytes = 0
      for (const part of [geometry.foliage, geometry.stems]) {
        expect(part.index!.array).toBeInstanceOf(Uint16Array)
        bytes += part.index!.array.byteLength
        for (const attribute of Object.values(part.attributes)) {
          bytes += attribute.array.byteLength
        }
      }
      expect(bytes).toBeLessThan(originalBytes * 0.2)
    } finally {
      geometry.dispose()
    }
  })
})
describe('botanical geometry assembly', () => {
  test.each([false, true])('merging preserves rendered attributes and disposes inputs once, mixed indexing: %s', mixed => {
    const first = new BoxGeometry
    const second = new BoxGeometry
    const firstFlat = first.toNonIndexed()
    const secondFlat = second.toNonIndexed()
    const inputs = [first, mixed ? secondFlat : second]
    let disposed = 0
    for (const input of inputs) {
      input.addEventListener('dispose', () => disposed++)
    }
    const merged = mergeParts(inputs)
    const rendered = merged.index ? merged.toNonIndexed() : merged
    try {
      expect(disposed).toBe(2)
      expect(merged.index).not.toBeNull()
      expect(triangleCount(merged)).toBe(24)
      if (!mixed) {
        expect(merged.getAttribute('position').count).toBe(48)
      }
      for (const name of ['position', 'normal', 'uv']) {
        expect([...rendered.getAttribute(name).array]).toEqual([...firstFlat.getAttribute(name).array, ...secondFlat.getAttribute(name).array])
      }
      expect(merged.boundingBox).not.toBeNull()
      expect(merged.boundingSphere).not.toBeNull()
    } finally {
      for (const geometry of new Set([firstFlat, mixed ? second : secondFlat, merged, rendered])) {
        geometry.dispose()
      }
    }
  })
  test('grid reduction copies the original shading attributes without retaining unused vertices', () => {
    const source = new PlaneGeometry(1, 1, 4, 4)
    const count = source.getAttribute('position').count
    source.setAttribute('color', new Float32BufferAttribute(Array.from({length: count * 3}, (_, i) => i / (count * 3)), 3))
    const rows = [0, 2, 4]
    const columns = [0, 1, 2, 4]
    const sampled = sampleGrid(source, 4, rows, columns)
    try {
      expect(sampled.getAttribute('position').count).toBe(rows.length * columns.length)
      expect(triangleCount(sampled)).toBe((rows.length - 1) * (columns.length - 1) * 2)
      expect(sampled.index!.array.slice(0, 6)).toEqual(new Uint16Array([0, 1, 4, 1, 5, 4]))
      for (const [name, attribute] of Object.entries(source.attributes)) {
        const expected = rows.flatMap(row => columns.flatMap(column => {
          const vertex = row * 5 + column
          return Array.from({length: attribute.itemSize}, (_, component) => attribute.getComponent(vertex, component))
        }))
        expect([...sampled.getAttribute(name).array]).toEqual(expected)
      }
    } finally {
      source.dispose()
      sampled.dispose()
    }
  })
})

import type {BufferGeometry} from 'three/webgpu'

import {expect} from 'bun:test'

import {Vector3} from 'three/webgpu'

const key = (vector: Vector3) => [vector.x, vector.y, vector.z].map(value => Math.round(value * 1e5)).join(':')
const point = (attribute: ReturnType<BufferGeometry['getAttribute']>, index: number) => new Vector3(attribute.getX(index), attribute.getY(index), attribute.getZ(index))

/** Every triangle has area, faces along its shading normals and every edge is shared by exactly two triangles. */
export function expectClosedAndOutward(part: BufferGeometry) {
  const positions = part.getAttribute('position')
  const normals = part.getAttribute('normal')
  const indices = part.index!
  const edges = new Map<string, number>
  for (let i = 0; i < indices.count; i += 3) {
    const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)]
    const [a, b, c] = ids.map(index => point(positions, index))
    const face = b.clone().sub(a).cross(c.clone().sub(a))
    expect(face.length()).toBeGreaterThan(1e-10)
    const shading = ids.reduce((sum, index) => sum.add(point(normals, index)), new Vector3).normalize()
    expect(face.normalize().dot(shading)).toBeGreaterThan(0.9)
    for (const [from, to] of [[a, b], [b, c], [c, a]]) {
      const edge = [key(from), key(to)].toSorted().join('/')
      edges.set(edge, (edges.get(edge) ?? 0) + 1)
    }
  }
  expect(edges.values().every(count => count === 2)).toBe(true)
}

import type {BufferGeometry, Scene} from 'three/webgpu'

import {InterleavedBuffer, InterleavedBufferAttribute, Mesh} from 'three/webgpu'

export const cornerNames = ['floodCorner0', 'floodCorner1', 'floodCorner2'] as const
export const barycentricName = 'floodBarycentric'

// 3 corner offsets and a barycentric coordinate per vertex
const stride = 12
/** A copy of the geometry in which every triangle has vertices of its own, each carrying the offsets from itself to its triangle’s three corners, so flat varyings hand the whole triangle its corners, and its barycentric coordinate, so a fragment knows how far it is from the triangle’s edges. Everything shares one interleaved buffer, since WebGPU allows only 8 vertex buffers. */
function withTriangleAttributes(geometry: BufferGeometry) {
  const triangles = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  const position = triangles.getAttribute('position')
  const values = new Float32Array(position.count * stride)
  for (let first = 0; first + 2 < position.count; first += 3) {
    for (let vertex = first; vertex < first + 3; vertex++) {
      for (let corner = 0; corner < 3; corner++) {
        for (let axis = 0; axis < 3; axis++) {
          values[vertex * stride + corner * 3 + axis] = position.getComponent(first + corner, axis) - position.getComponent(vertex, axis)
        }
      }
      values[vertex * stride + 9 + vertex - first] = 1
    }
  }
  const buffer = new InterleavedBuffer(values, stride)
  for (const [corner, name] of cornerNames.entries()) {
    triangles.setAttribute(name, new InterleavedBufferAttribute(buffer, 3, corner * 3))
  }
  triangles.setAttribute(barycentricName, new InterleavedBufferAttribute(buffer, 3, 9))
  return triangles
}
const copies = new Map<BufferGeometry, {
  geometry: BufferGeometry
  version: number
}>

/** Swaps the geometry of every visible mesh for its per-triangle copy and returns a function that swaps them back. */
export function swapTriangleGeometry(scene: Scene) {
  const swapped: Array<[Mesh, BufferGeometry]> = []
  scene.traverseVisible(object => {
    if (!(object instanceof Mesh)) {
      return
    }
    const mesh = object as Mesh
    if ('position' in mesh.geometry.attributes) {
      swapped.push([mesh, mesh.geometry])
      mesh.geometry = copyOf(mesh.geometry)
    }
  })
  return () => {
    for (const [mesh, geometry] of swapped) {
      mesh.geometry = geometry
    }
  }
}

/** The per-triangle copy of a geometry, made again whenever its positions change, like for geometry rebuilt in place. Copies live as long as the page, which suits the headless renders they are meant for. */
function copyOf(geometry: BufferGeometry) {
  const position = geometry.getAttribute('position')
  const version = 'isInterleavedBufferAttribute' in position ? position.data.version : position.version
  const copy = copies.get(geometry)
  if (copy?.version === version) {
    return copy.geometry
  }
  copy?.geometry.dispose()
  const triangles = withTriangleAttributes(geometry)
  copies.set(geometry, {
    geometry: triangles,
    version,
  })
  return triangles
}

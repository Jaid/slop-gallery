import {describe, expect, test} from 'bun:test'

import {BufferGeometry, Float32BufferAttribute, Mesh, Scene} from 'three/webgpu'

import {barycentricName, cornerNames, swapTriangleGeometry} from '../src/triangleGeometry.ts'

class SizedGeometry extends BufferGeometry {
  constructor(size: number) {
    super()
    if (!(size > 0)) {
      throw new RangeError('A sized geometry needs a positive size.')
    }
    this.setAttribute('position', new Float32BufferAttribute([0, 0, 0, size, 0, 0, 0, size, 0], 3))
  }
}
describe('swapTriangleGeometry', () => {
  test('copies geometry whose class needs constructor arguments and swaps it back', () => {
    const geometry = new SizedGeometry(2)
    const mesh = new Mesh(geometry)
    const scene = new Scene
    scene.add(mesh)
    const swapBack = swapTriangleGeometry(scene)
    expect(mesh.geometry).not.toBe(geometry)
    for (const name of [...cornerNames, barycentricName]) {
      expect(mesh.geometry.getAttribute(name).count).toBe(3)
    }
    expect(mesh.geometry.getAttribute('position').getX(1)).toBe(2)
    swapBack()
    expect(mesh.geometry).toBe(geometry)
  })
})

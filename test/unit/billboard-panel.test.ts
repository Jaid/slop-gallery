import {expect, test} from 'bun:test'

import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import BillboardPanelGeometry from '../../src/lib/knots/BillboardPanelGeometry.ts'

test('billboard timber has no competing front face, but retains its back and edges', () => {
  const geometry = new BillboardPanelGeometry(4.8, 2.75, 0.05)
  const material = new MeshBasicMaterial
  try {
    const mesh = new Mesh(geometry, material)
    expect(geometry.index!.count).toBe(30)
    expect(new Raycaster(new Vector3(0, 0, 1), new Vector3(0, 0, -1)).intersectObject(mesh)).toHaveLength(0)
    for (const [origin, direction, distance] of [
      [new Vector3(0, 0, -1), new Vector3(0, 0, 1), 0.975],
      [new Vector3(3, 0, 0), new Vector3(-1, 0, 0), 0.6],
      [new Vector3(-3, 0, 0), new Vector3(1, 0, 0), 0.6],
      [new Vector3(0, 2, 0), new Vector3(0, -1, 0), 0.625],
      [new Vector3(0, -2, 0), new Vector3(0, 1, 0), 0.625],
    ] as const) {
      const hits = new Raycaster(origin, direction).intersectObject(mesh)
      expect(hits.length).toBeGreaterThan(0)
      expect(hits[0].distance).toBeCloseTo(distance, 6)
    }
  } finally {
    geometry.dispose()
    material.dispose()
  }
})

import {expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {BoxGeometry, Euler, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {billboardParts, knotSign, knotSignParts, knotSignPosition} from '../../src/lib/knots/signs.ts'

await RAPIER.init()
for (const [title, parts, elevation] of [
  ['nameplate', knotSignParts, knotSign.elevation],
  ['wide billboard', billboardParts(4.8, 2.4), 1.5],
  ['tall billboard', billboardParts(2.75, 2.75), 1.5],
] as const) {
  test(`${title} has grounded supports and matching solid cuboids`, () => {
    const world = new RAPIER.World({
      x: 0,
      y: -9.81,
      z: 0,
    })
    const material = new MeshBasicMaterial
    const meshes: Array<Mesh<BoxGeometry>> = []
    try {
      for (const {position, rotation = [0, 0, 0], size} of parts) {
        expect(size.every(value => value > 0)).toBe(true)
        const mesh = new Mesh(new BoxGeometry(...size), material)
        mesh.position.set(...position)
        mesh.rotation.set(rotation[0], rotation[1], rotation[2])
        mesh.updateMatrixWorld()
        meshes.push(mesh)
        world.createCollider(RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2).setTranslation(...position).setRotation((new Quaternion).setFromEuler(new Euler(...rotation))))
      }
      expect(Math.min(...parts.filter(part => !part.rotation).map(part => part.position[1] - part.size[1] / 2)) + elevation).toBeCloseTo(0, 6)
      expect(parts[0].position[2] + parts[0].size[2] / 2).toBeCloseTo(0, 6)
      expect(parts[0].size[2]).toBeLessThanOrEqual(0.05)
      world.step()
      for (const side of [-1, 1]) {
        for (const part of parts) {
          const origin = new Vector3(part.position[0], part.position[1], side * 2)
          const direction = new Vector3(0, 0, -side)
          const visible = new Raycaster(origin, direction).intersectObjects(meshes)[0]
          const hit = world.castRay(new RAPIER.Ray(origin, direction), 4, true)
          expect(visible).toBeDefined()
          expect(hit).not.toBeNull()
          expect(hit!.timeOfImpact).toBeCloseTo(visible.distance, 5)
        }
      }
    } finally {
      world.free()
      material.dispose()
      for (const mesh of meshes) {
        mesh.geometry.dispose()
      }
    }
  })
}
test('nameplates stay in front of rotated exhibits', () => {
  for (const rotation of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const position = knotSignPosition({
      position: [3, 0, 5],
      rotation,
    })
    expect(position[0]).toBeCloseTo(3 + Math.sin(rotation) * 0.8)
    expect(position[1]).toBe(knotSign.elevation)
    expect(position[2]).toBeCloseTo(5 + Math.cos(rotation) * 0.8)
  }
})

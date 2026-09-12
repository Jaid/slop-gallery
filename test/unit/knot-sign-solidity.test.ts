import {expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {BoxGeometry, CylinderGeometry, Euler, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {billboardParts, knotSign, knotSignParts, knotSignPosition, knotSignRoundParts} from '../../src/lib/knots/signs.ts'

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
    const meshes: Array<Mesh> = []
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
      if (title === 'nameplate') {
        for (const {position, radius, height} of knotSignRoundParts) {
          const mesh = new Mesh(new CylinderGeometry(radius, radius, height, 48), material)
          mesh.position.set(...position)
          mesh.updateMatrixWorld()
          meshes.push(mesh)
          world.createCollider(RAPIER.ColliderDesc.cylinder(height / 2, radius).setTranslation(...position))
        }
        expect(Math.min(...knotSignRoundParts.map(part => part.position[1] - part.height / 2)) + elevation).toBeCloseTo(0, 6)
      } else {
        expect(Math.min(...parts.filter(part => !part.rotation).map(part => part.position[1] - part.size[1] / 2)) + elevation).toBeCloseTo(0, 6)
      }
      const face = new Vector3(0, 0, parts[0].size[2] / 2).applyEuler(new Euler(...parts[0].rotation ?? [0, 0, 0])).add(new Vector3(...parts[0].position))
      expect(face.length()).toBeCloseTo(0, 6)
      expect(parts[0].size[2]).toBeLessThanOrEqual(0.05)
      world.step()
      for (const side of [-1, 1]) {
        for (const part of title === 'nameplate' ? [...parts, ...knotSignRoundParts] : parts) {
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
test('nameplates stay diagonally beside rotated exhibits', () => {
  for (const rotation of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const position = knotSignPosition({
      position: [3, 0, 5],
      rotation,
    })
    expect(position[0]).toBeCloseTo(3 + Math.cos(rotation) * knotSign.sideOffset + Math.sin(rotation) * knotSign.frontOffset)
    expect(position[1]).toBe(knotSign.elevation)
    expect(position[2]).toBeCloseTo(5 - Math.sin(rotation) * knotSign.sideOffset + Math.cos(rotation) * knotSign.frontOffset)
  }
})
test('museum stand has a slender stem, round grounded foot and upward-facing plaque', () => {
  const [stem, base] = knotSignRoundParts
  expect(stem.radius).toBeLessThan(0.025)
  expect(base.radius).toBeGreaterThan(stem.radius * 8)
  expect(stem.position[1] - stem.height / 2 + knotSign.elevation).toBeCloseTo(0)
  expect(stem.position[1] + stem.height / 2).toBeCloseTo(0)
  const normal = new Vector3(0, 0, 1).applyEuler(new Euler(knotSign.tilt, 0, 0))
  expect(normal.y).toBeGreaterThan(0)
  expect(normal.z).toBeGreaterThan(0.8)
  expect(Math.abs(knotSign.sideOffset) - knotSign.width / 2).toBeGreaterThan(0.5)
})
test('stand stays on the left with its back turned toward its knot', () => {
  expect(knotSign.sideOffset).toBeLessThan(0)
  for (const rotation of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const position = knotSignPosition({
      position: [0, 0, 0],
      rotation,
    })
    const towardKnot = new Vector3(-position[0], 0, -position[2]).normalize()
    const back = new Vector3(0, 0, -1).applyAxisAngle(new Vector3(0, 1, 0), rotation + knotSign.inwardRotation)
    expect(back.dot(towardKnot)).toBeGreaterThan(0.8)
  }
})

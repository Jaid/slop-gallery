import type {BufferAttribute, InterleavedBufferAttribute} from 'three/webgpu'

import {expect, spyOn, test} from 'bun:test'

import {AdditiveBlending, Box3, Mesh, Vector3} from 'three/webgpu'

import Coals, {clearOfLogs, fireCoals} from '../../src/lib/gallery/fireplace/Coals.ts'
import fire from '../../src/lib/gallery/fireplace/config.ts'
import FireSparks, {fireSparks} from '../../src/lib/gallery/fireplace/FireSparks.ts'
import FlameGeometry, {fireFlames} from '../../src/lib/gallery/fireplace/FlameGeometry.ts'
import fireFlicker from '../../src/lib/gallery/fireplace/flicker.ts'
import LogGeometry from '../../src/lib/gallery/fireplace/LogGeometry.ts'
import CharredLogMaterial from '../../src/lib/materials/CharredLogMaterial.ts'
import EmberBedMaterial from '../../src/lib/materials/EmberBedMaterial.ts'
import FlameMaterial from '../../src/lib/materials/FlameMaterial.ts'

// The firebox in the fire frame: hearth top, lintel underside, the inner faces of the pillars and the back plate.
const firebox = {
  floor: 0.2,
  lintel: 1.9,
  halfWidth: 1.15,
  back: -0.47,
  front: 0.45,
}
const boundsOf = (mesh: Mesh, precise: boolean) => {
  const box = new Box3
  return box.setFromObject(mesh, precise)
}
const unitLength = (attribute: BufferAttribute | InterleavedBufferAttribute, index: number) => {
  const vector = new Vector3
  return vector.fromBufferAttribute(attribute, index).length()
}
const pileMeshes = () => fire.pile.map(({position, yaw, pitch, shape}) => {
  const mesh = new Mesh(new LogGeometry(shape))
  mesh.position.set(...position)
  mesh.rotation.set(0, yaw, Math.PI / 2 + pitch)
  mesh.updateMatrixWorld()
  return mesh
})
test('the burning logs lie on the hearth inside the firebox, the branch across both logs', () => {
  const meshes = pileMeshes()
  try {
    for (const mesh of meshes) {
      const box = boundsOf(mesh, true)
      expect(box.min.y).toBeGreaterThan(firebox.floor - 0.01)
      expect(box.max.y).toBeLessThan(firebox.lintel)
      expect(Math.max(-box.min.x, box.max.x)).toBeLessThan(firebox.halfWidth)
      expect(box.min.z).toBeGreaterThan(firebox.back)
      expect(box.max.z).toBeLessThan(firebox.front + 0.05)
    }
    // The branch spans the gap between the logs, so it crosses above both log axes.
    const branch = boundsOf(meshes[2], true)
    expect(branch.min.z).toBeLessThan(fire.pile[1].position[2])
    expect(branch.max.z).toBeGreaterThan(fire.pile[0].position[2])
    expect(branch.min.y).toBeGreaterThan(Math.min(fire.pile[0].position[1], fire.pile[1].position[1]))
  } finally {
    for (const mesh of meshes) {
      mesh.geometry.dispose()
    }
  }
})
test('log geometry is irregular firewood, but keeps its rims welded and its normals unit length', () => {
  const shape = fire.pile[0].shape
  const geometry = new LogGeometry(shape)
  try {
    const position = geometry.getAttribute('position')
    const normal = geometry.getAttribute('normal')
    const radii = new Set<number>
    const ends = new Map<string, number>
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i)
      expect(unitLength(normal, i)).toBeCloseTo(1, 4)
      if (Math.abs(y) < shape.length / 2 - 1e-6) {
        continue
      }
      // Every rim vertex of the side has a cap twin at exactly the same position.
      const key = [position.getX(i), y, position.getZ(i)].map(value => value.toFixed(6)).join()
      ends.set(key, (ends.get(key) ?? 0) + 1)
      radii.add(Math.round(Math.hypot(position.getX(i), position.getZ(i)) * 1000))
    }
    expect(ends.values().filter(count => count < 2).toArray()).toHaveLength(0)
    // A turned dowel would only have one rim radius per end.
    expect(radii.size).toBeGreaterThan(10)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.y).toBeCloseTo(shape.length / 2)
  } finally {
    geometry.dispose()
  }
})
test('flames rise from inside the firebox and stay well below the lintel', () => {
  const flames = fireFlames()
  expect(flames.length).toBeGreaterThan(8)
  for (const {origin, size} of flames) {
    expect(origin[1]).toBeGreaterThan(firebox.floor)
    expect(origin[1] + size[1]).toBeLessThan(firebox.lintel - 0.5)
    expect(Math.abs(origin[0]) + size[0] / 2).toBeLessThan(firebox.halfWidth)
    expect(origin[2]).toBeGreaterThan(firebox.back)
    expect(origin[2]).toBeLessThan(fire.pile[0].position[2])
  }
  const geometry = new FlameGeometry(flames)
  try {
    expect(geometry.index!.count).toBe(flames.length * 6)
    for (const name of ['flameOrigin', 'flameSize', 'flameSeed']) {
      expect(geometry.getAttribute(name).count).toBe(flames.length * 4)
    }
    // Billboards turn toward the camera; the bounds must hold them in every orientation.
    for (const {origin, size} of flames) {
      for (const angle of [0, Math.PI / 4, Math.PI / 2]) {
        const corner = new Vector3(origin[0] + Math.cos(angle) * size[0] / 2, origin[1] + size[1], origin[2] + Math.sin(angle) * size[0] / 2)
        expect(geometry.boundingBox!.containsPoint(corner)).toBe(true)
        expect(geometry.boundingSphere!.containsPoint(corner)).toBe(true)
      }
    }
  } finally {
    geometry.dispose()
  }
})
test('coals stay on the dark part of the bed and never sit inside a log', () => {
  const coals = fireCoals()
  expect(coals).toHaveLength(fire.coals.count)
  const [width, depth] = fire.embers.size
  for (const {position, heat} of coals) {
    expect(Math.hypot(position[0] / (width / 2), position[2] / (depth / 2))).toBeLessThan(0.8)
    expect(heat).toBeGreaterThan(0)
    expect(heat).toBeLessThanOrEqual(1)
    expect(clearOfLogs(position[0], position[2])).toBe(true)
  }
})
test('sparks burn out before they reach the lintel', () => {
  for (const {origin, speed, lifetime, wander} of fireSparks()) {
    expect(origin[1] + speed * lifetime).toBeLessThanOrEqual(fire.sparks.maximumHeight + 1e-9)
    expect(Math.abs(origin[0]) + wander * lifetime).toBeLessThan(firebox.halfWidth)
  }
  expect(fire.sparks.maximumHeight).toBeLessThan(firebox.lintel)
})
test('the firelight flickers within a narrow, never-dark band', () => {
  let minimum = Infinity
  let maximum = -Infinity
  for (let time = 0; time < 120; time += 1 / 60) {
    const value = fireFlicker(time)
    minimum = Math.min(minimum, value)
    maximum = Math.max(maximum, value)
  }
  expect(minimum).toBeGreaterThan(0.65)
  expect(maximum).toBeLessThan(1.15)
  expect(maximum - minimum).toBeGreaterThan(0.2)
})
test('fire materials glow without lighting, and flames are additive light that never writes depth', () => {
  const flame = new FlameMaterial
  const bed = new EmberBedMaterial(fire.embers.size)
  const log = new CharredLogMaterial(1, 0.8, 0.18)
  try {
    expect(flame.blending).toBe(AdditiveBlending)
    expect(flame.transparent).toBe(true)
    expect(flame.depthWrite).toBe(false)
    expect(flame.positionNode).not.toBeNull()
    expect(flame.colorNode).not.toBeNull()
    // Empty quad corners must not overwrite the normal and velocity targets.
    expect(flame.maskNode).not.toBeNull()
    expect(bed.transparent).toBe(true)
    expect(bed.depthWrite).toBe(false)
    expect(bed.emissiveNode).not.toBeNull()
    expect(bed.opacityNode).not.toBeNull()
    expect(log.emissiveNode).not.toBeNull()
    expect(log.normalNode).not.toBeNull()
  } finally {
    flame.dispose()
    bed.dispose()
    log.dispose()
  }
})
test('instanced coals and sparks dispose their own geometry and material', () => {
  for (const effect of [new Coals, new FireSparks]) {
    const geometry = spyOn(effect.geometry, 'dispose')
    const material = spyOn(effect.material, 'dispose')
    expect(effect.count).toBeGreaterThan(0)
    effect.dispose()
    expect(geometry).toHaveBeenCalledTimes(1)
    expect(material).toHaveBeenCalledTimes(1)
  }
})

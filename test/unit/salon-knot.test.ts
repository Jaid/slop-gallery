import {expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {common, ethereal, knots, prime, rare} from 'knot-materials'
import KnotResources from 'knot-materials/KnotResources.ts'
import {knotSign} from 'knot-materials/signs.ts'
import {Euler, Quaternion, Vector3} from 'three/webgpu'

import PedestalGeometry, {pedestalHeight} from '../../src/lib/gallery/PedestalGeometry.ts'
import {salonBench, salonPedestal} from '../../src/lib/gallery/salon.ts'
import {knotStandingHeight, knotStandingRoll, standingKnotSink, standKnot} from '../../src/lib/physics/standingKnot.ts'
import salonKnot, {salonKnotHeight, salonKnotRarityChances, salonKnots, salonKnotSign} from '../../src/rooms/salon/knot.ts'

await RAPIER.init()
/** the integration parameters `<Physics>` of @react-three/rapier sets by default, which predict contacts much closer than Rapier’s own */
const fiberIntegration = {
  normalizedAllowedLinearError: 0.001,
  normalizedPredictionDistance: 0.002,
}
const seeds = Array.from({length: 4000}, (_, seed) => seed)
test('a standing Knot is scaled to its height and lifted onto its foot', () => {
  const resources = new KnotResources([knots[0]])
  try {
    const [{colliderVertices}] = resources.items
    const unscaled = standKnot(colliderVertices, 1)
    expect(1 / unscaled.scale).toBeCloseTo(knotStandingHeight, 4)
    const {lift, scale, vertices} = standKnot(colliderVertices, salonKnotHeight)
    const roll = new Quaternion
    roll.setFromEuler(new Euler(0, 0, knotStandingRoll))
    const point = new Vector3
    let bottom = Infinity
    let top = -Infinity
    for (let i = 0; i < vertices.length; i += 3) {
      point.fromArray(vertices, i).applyQuaternion(roll)
      bottom = Math.min(bottom, point.y)
      top = Math.max(top, point.y)
    }
    expect(vertices[0]).toBeCloseTo(colliderVertices[0] * scale, 6)
    expect(top - bottom).toBeCloseTo(salonKnotHeight, 6)
    expect(bottom + lift).toBeCloseTo(0, 6)
    // One lobe points straight up, so the Knot is as high above its middle as its lobes reach out.
    expect(top).toBeGreaterThan(-bottom)
  } finally {
    resources.dispose()
  }
})
test('the seed alone picks the Salon’s Knot among those that can stand, rolling the rarity first', () => {
  expect(salonKnotRarityChances.reduce((sum, [, chance]) => sum + chance, 0)).toBeCloseTo(1, 9)
  expect(salonKnots.length).toBeGreaterThan(knots.length / 2)
  for (const knot of salonKnots) {
    expect((knot.displacement ?? 0) * salonKnotHeight / knotStandingHeight).toBeLessThanOrEqual(standingKnotSink)
  }
  expect(salonKnot(7).entry.id).toBe(salonKnot(7).entry.id)
  const rarities = new Map<number, number>
  const ids = new Set<string>
  for (const seed of seeds) {
    const {entry, height, position} = salonKnot(seed)
    expect(salonKnots).toContain(entry)
    expect(height).toBe(salonKnotHeight)
    expect(position).toEqual([salonPedestal[0], salonPedestal[1] + pedestalHeight, salonPedestal[2]])
    rarities.set(entry.rarity, (rarities.get(entry.rarity) ?? 0) + 1)
    ids.add(entry.id)
  }
  expect(rarities.keys().toArray().toSorted((a, b) => a - b)).toEqual([common, rare, prime, ethereal])
  for (const [rarity, chance] of salonKnotRarityChances) {
    expect(Math.abs(rarities.get(rarity)! / seeds.length - chance)).toBeLessThan(0.025)
  }
  expect(ids.size).toBeGreaterThan(salonKnots.length / 2)
})
test('every Salon Knot stands on its own on the pedestal under Fiber’s physics, also after a nudge', () => {
  // The most displaced one, which once toppled with a contact skin for its displacement, stands like any other.
  const thickest = salonKnots.reduce((best, knot) => ((knot.displacement ?? 0) > (best.displacement ?? 0) ? knot : best))
  expect(thickest.displacement).toBeGreaterThan(0.005)
  const resources = new KnotResources([thickest])
  const pedestal = new PedestalGeometry
  try {
    for (const [yaw, nudge] of [[0, 0], [0, 0.02], [1, -0.03], [2, 0.03]]) {
      const world = new RAPIER.World({
        x: 0,
        y: -9.81,
        z: 0,
      })
      Object.assign(world.integrationParameters, fiberIntegration)
      try {
        for (const [vertices, indices] of pedestal.collision) {
          world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices))
        }
        const {lift, vertices} = standKnot(resources.items[0].colliderVertices, salonKnotHeight)
        const rotation = new Quaternion
        rotation.setFromEuler(new Euler(0, yaw, knotStandingRoll))
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, pedestalHeight + lift, 0).setRotation(rotation).setCcdEnabled(true))
        // As in the game: the explicit collider keeps its own density, friction and restitution.
        world.createCollider(RAPIER.ColliderDesc.convexHull(vertices)!, body)
        body.applyImpulse({
          x: nudge * body.mass(),
          y: 0,
          z: nudge * body.mass(),
        }, true)
        for (let step = 0; step < 60 * 20; step++) {
          world.step()
        }
        const {x, y, z, w} = body.rotation()
        const up = new Vector3(1, 0, 0)
        up.applyQuaternion(new Quaternion(x, y, z, w))
        const position = body.translation()
        expect(up.y).toBeGreaterThan(Math.cos(3 * Math.PI / 180))
        expect(position.y).toBeCloseTo(pedestalHeight + lift, 2)
        expect(Math.hypot(position.x, position.z)).toBeLessThan(0.05)
        expect(body.isSleeping()).toBe(true)
      } finally {
        world.free()
      }
    }
  } finally {
    pedestal.dispose()
    resources.dispose()
  }
})
test('a contact skin thicker than Fiber’s prediction distance topples a standing Knot', () => {
  const resources = new KnotResources([knots[0]])
  const pedestal = new PedestalGeometry
  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  Object.assign(world.integrationParameters, fiberIntegration)
  try {
    for (const [vertices, indices] of pedestal.collision) {
      world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices))
    }
    const {lift, vertices} = standKnot(resources.items[0].colliderVertices, salonKnotHeight)
    const rotation = new Quaternion
    rotation.setFromEuler(new Euler(0, 0, knotStandingRoll))
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, pedestalHeight + lift + 0.006, 0).setRotation(rotation).setCcdEnabled(true))
    world.createCollider(RAPIER.ColliderDesc.convexHull(vertices)!.setContactSkin(0.006), body)
    for (let step = 0; step < 60 * 20; step++) {
      world.step()
    }
    expect(body.translation().y).toBeLessThan(pedestalHeight)
  } finally {
    world.free()
    pedestal.dispose()
    resources.dispose()
  }
})
test('the Knot’s nameplate stands on the Salon’s floor between the pedestal and the ottoman, facing the ottoman', () => {
  const {position: [x, y, z], rotation} = salonKnotSign
  expect(y).toBe(knotSign.elevation)
  expect(z).toBeGreaterThan(salonPedestal[2] + 1.5)
  expect(z).toBeLessThan(salonBench.position[2] - salonBench.depth / 2 - 1.5)
  // Facing +z at no rotation, turned toward the ottoman’s middle.
  const facing = [Math.sin(rotation), Math.cos(rotation)]
  const toBench = [salonBench.position[0] - x, salonBench.position[2] - z]
  const length = Math.hypot(...toBench)
  expect(facing[0]).toBeCloseTo(toBench[0] / length, 9)
  expect(facing[1]).toBeCloseTo(toBench[1] / length, 9)
})

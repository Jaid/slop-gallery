import type {Curio} from '../../src/lib/gallery/curios/index.ts'
import type {BufferGeometry} from 'three/webgpu'

import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {Box3, Euler, Quaternion, Vector3} from 'three/webgpu'

import {banquet, banquetTable, banquetTableColliders} from '../../src/lib/gallery/banquet.ts'
import {curios, helmet, knife, pumpkin} from '../../src/lib/gallery/curios/index.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'
import {fortressColliders, physicsWorld} from './helpers/fortressWorld.ts'

await RAPIER.init()
/** the volume a surface encloses, positive while it faces out */
const signedVolume = (geometry: BufferGeometry) => {
  const position = geometry.getAttribute('position')
  const index = geometry.index!
  const [a, b, c] = [new Vector3, new Vector3, new Vector3]
  let volume = 0
  for (let i = 0; i < index.count; i += 3) {
    a.fromBufferAttribute(position, index.getX(i))
    b.fromBufferAttribute(position, index.getX(i + 1))
    c.fromBufferAttribute(position, index.getX(i + 2))
    volume += a.dot(b.cross(c)) / 6
  }
  return volume
}
const sizeOf = (geometry: BufferGeometry) => (new Box3).setFromBufferAttribute(geometry.getAttribute('position') as never).getSize(new Vector3)
describe('the curios', () => {
  test('each is a prop of its own, lying in its room when a game begins', () => {
    expect(curios.map(curio => curio.propId)).toEqual(['prop-pumpkin', 'prop-knife', 'prop-helmet'])
    for (const curio of curios) {
      expect(slopGallery.roomAt(curio.position)?.id).toBe(curio.room)
    }
    expect([pumpkin.room, knife.room, helmet.room]).toEqual(['banquet', 'banquet', 'fortress'])
  })
  for (const curio of curios) {
    test(`the ${curio.id}’s meshes face out, carry what their materials read and fit its reach`, () => {
      const model = curio.createModel()
      try {
        for (const {geometry, material} of model.parts) {
          const position = geometry.getAttribute('position')
          expect(position.array.every(Number.isFinite)).toBe(true)
          expect(signedVolume(geometry)).toBeGreaterThan(0)
          if (material.name === 'Forged steel') {
            expect(geometry.getAttribute('steelMask').count).toBe(position.count)
          }
        }
        const bounds = new Box3
        for (const {geometry} of model.parts) {
          bounds.union((new Box3).setFromBufferAttribute(geometry.getAttribute('position') as never))
        }
        // The camera orbits it from outside.
        expect(bounds.getSize(new Vector3).length() / 2).toBeLessThan(curio.reach)
        // Its hull is a few dozen of its corners, reaching out as far as its meshes do.
        const {hull} = model
        expect(hull.length / 3).toBeGreaterThan(30)
        expect(hull.length / 3).toBeLessThanOrEqual(128)
        const hullBounds = (new Box3).setFromArray(hull)
        expect(hullBounds.min.distanceTo(bounds.min)).toBeLessThan(0.01)
        expect(hullBounds.max.distanceTo(bounds.max)).toBeLessThan(0.01)
      } finally {
        model.dispose()
      }
    })
  }
  test('the pumpkin and the helmet keep within 16 384 triangles each, their fine relief left to their materials', () => {
    for (const curio of [pumpkin, helmet]) {
      const model = curio.createModel()
      expect(model.parts.reduce((sum, {geometry}) => sum + geometry.index!.count / 3, 0)).toBeLessThanOrEqual(16_384)
      model.dispose()
    }
  })
  test('the pumpkin is a squat one a third of a meter across, its stem rising out of the hollow at its top, and the cleaver’s handle wood and its blade, pommel and rivets steel', () => {
    const model = pumpkin.createModel()
    const [rind, stem] = model.parts.map(({geometry}) => geometry)
    const size = sizeOf(rind)
    expect(size.x).toBeGreaterThan(0.28)
    expect(size.x).toBeLessThan(0.33)
    expect(size.y / size.x).toBeLessThan(0.85)
    stem.computeBoundingBox()
    expect(stem.boundingBox!.max.y).toBeGreaterThan(size.y + 0.02)
    expect(stem.boundingBox!.min.y).toBeLessThan(size.y - 0.02)
    model.dispose()
    const cleaver = knife.createModel()
    expect(cleaver.parts.map(({material}) => material.name)).toEqual(['Forged steel', ''])
    expect(cleaver.parts[1].geometry.hasAttribute('woodGrain')).toBe(true)
    expect(sizeOf(cleaver.parts[0].geometry).x).toBeGreaterThan(0.32)
    cleaver.dispose()
  })
})
/** Drops the curio where it lies when a game begins into the world, its body as `Curio` builds it, lets it settle for four seconds, and returns where it went, which way its own up then points and whether it has fallen asleep. */
function settle(curio: Curio, world: RAPIER.World) {
  const model = curio.createModel()
  try {
    const rotation = (new Quaternion).setFromEuler(new Euler(...curio.rotation))
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(...curio.position).setRotation(rotation).setCcdEnabled(true))
    world.createCollider(RAPIER.ColliderDesc.convexHull(model.hull)!.setMass(curio.mass).setFriction(0.8).setRestitution(0.32), body)
    for (let step = 0; step < 60 * 4; step++) {
      world.step()
    }
    const {x, y, z} = body.translation()
    const {x: qx, y: qy, z: qz, w} = body.rotation()
    return {
      asleep: body.isSleeping(),
      moved: Math.hypot(x - curio.position[0], z - curio.position[2]),
      y,
      /** its own up, and the axis its cleaver’s blade faces along, in the world */
      up: new Vector3(0, 1, 0).applyQuaternion(new Quaternion(qx, qy, qz, w)),
      facing: new Vector3(0, 0, 1).applyQuaternion(new Quaternion(qx, qy, qz, w)),
    }
  } finally {
    model.dispose()
  }
}
describe('where a game begins, each curio comes to rest where it lies', () => {
  const banquetWorld = () => {
    const world = new RAPIER.World({
      x: 0,
      y: -9.81,
      z: 0,
    })
    world.timestep = 1 / 60
    world.createCollider(RAPIER.ColliderDesc.cuboid(banquet.size[0] / 2, 0.12, banquet.size[1] / 2).setTranslation(banquet.center[0], -0.12, banquet.center[1]))
    for (const {center: [x, y, z], size: [width, height, depth]} of banquetTableColliders()) {
      world.createCollider(RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2).setTranslation(banquet.center[0] + x, y, banquet.center[1] + z))
    }
    return world
  }
  test('the pumpkin sits upright on the table', () => {
    const world = banquetWorld()
    try {
      const {asleep, moved, up, y} = settle(pumpkin, world)
      expect(asleep).toBe(true)
      expect(moved).toBeLessThan(0.03)
      expect(y).toBeGreaterThan(banquetTable.height - 0.01)
      expect(y).toBeLessThan(banquetTable.height + 0.01)
      expect(up.y).toBeGreaterThan(0.97)
    } finally {
      world.free()
    }
  })
  test('the cleaver lies flat on the table, on its side', () => {
    const world = banquetWorld()
    try {
      const {asleep, facing, moved, y} = settle(knife, world)
      expect(asleep).toBe(true)
      expect(moved).toBeLessThan(0.03)
      expect(y).toBeGreaterThan(banquetTable.height)
      expect(y).toBeLessThan(banquetTable.height + 0.02)
      expect(facing.y).toBeGreaterThan(0.95)
    } finally {
      world.free()
    }
  })
  test('the helmet stands on its gorget in the Fortress’ mouth', () => {
    const world = physicsWorld(fortressColliders())
    try {
      const {asleep, moved, up, y} = settle(helmet, world)
      expect(asleep).toBe(true)
      expect(moved).toBeLessThan(0.03)
      expect(Math.abs(y - helmet.position[1])).toBeLessThan(0.01)
      expect(up.y).toBeGreaterThan(0.99)
    } finally {
      world.free()
    }
  })
})

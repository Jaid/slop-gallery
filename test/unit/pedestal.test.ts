import {afterEach, beforeEach, describe, expect, test} from 'bun:test'
import RAPIER from '@dimforge/rapier3d-compat'
import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {PedestalGeometry} from '../../src/lib/gallery/PedestalGeometry.ts'
import {LimestoneMaterial} from '../../src/lib/materials/LimestoneMaterial.ts'
import {GrabbableBody} from '../../src/lib/physics/GrabbableBody.ts'
import {PropPlacement} from '../../src/lib/physics/PropPlacement.ts'

await RAPIER.init()
let geometry: PedestalGeometry
let world: RAPIER.World
const material = new MeshBasicMaterial
beforeEach(() => {
  geometry = new PedestalGeometry
  world = new RAPIER.World({x: 0, y: -9.81, z: 0})
  for (const [vertices, indices] of geometry.collision) {
    world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices))
  }
  world.step()
})
afterEach(() => {
  geometry.dispose()
  world.free()
})

describe('sculpture pedestals', () => {
  test('preserves the support height and footprint with finite, bounded geometry', () => {
    const bounds = geometry.stone.boundingBox!
    expect(bounds.min.y).toBeCloseTo(0, 6)
    expect(bounds.max.y).toBeCloseTo(1.35, 6)
    expect(bounds.getSize(new Vector3).x).toBeCloseTo(1.16, 6)
    expect(bounds.getSize(new Vector3).z).toBeCloseTo(1.16, 6)
    let triangles = 0
    for (const part of [geometry.stone, geometry.bronze, geometry.reveals]) {
      for (const attribute of ['position', 'normal', 'uv']) {
        expect(Array.from(part.getAttribute(attribute).array).every(Number.isFinite)).toBe(true)
      }
      const normals = part.getAttribute('normal')
      const normal = new Vector3
      let unitNormals = true
      for (let i = 0; i < normals.count; i++) {
        if (Math.abs(normal.fromBufferAttribute(normals, i).length() - 1) > 1e-5) unitNormals = false
      }
      expect(unitNormals).toBe(true)
      expect(part.boundingBox!.min.y).toBeGreaterThanOrEqual(-1e-6)
      expect(part.boundingBox!.max.y).toBeLessThanOrEqual(1.350001)
      triangles += part.getAttribute('position').count / 3
    }
    expect(triangles).toBeLessThan(8000)
  })

  test('matches visible flutes, collars, ledges and chamfers with physical collision on all four faces', () => {
    const meshes = [geometry.stone, geometry.bronze, geometry.reveals].map(part => new Mesh(part, material))
    for (let side = 0; side < 4; side++) {
      for (const y of [0.004, 0.053, 0.12, 0.2, 0.237, 0.247, 0.4, 0.83, 1.133, 1.16, 1.22, 1.3, 1.346]) {
        for (const x of [0.013, 0.047, 0.079, 0.141, 0.329, 0.42, 0.466, 0.562]) {
          const origin = new Vector3(x, y, 2).applyAxisAngle(new Vector3(0, 1, 0), side * Math.PI / 2)
          const direction = new Vector3(0, 0, -1).applyAxisAngle(new Vector3(0, 1, 0), side * Math.PI / 2)
          const visible = new Raycaster(origin, direction, 0, 4).intersectObjects(meshes)[0]
          const collision = world.castRay(new RAPIER.Ray(origin, direction), 4, true)
          expect(!!visible).toBe(!!collision)
          if (visible) expect(collision!.timeOfImpact).toBeCloseTo(visible.distance, 5)
        }
      }
    }
    const stone = meshes[0]!
    const depth = (x: number) => new Raycaster(new Vector3(x, 0.7, 2), new Vector3(0, 0, -1)).intersectObject(stone)[0]!.distance
    expect(depth(0.047) - depth(0)).toBeCloseTo(0.022, 5)
  })

  test('keeps a dropped sculpture resting on the cap', () => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 1.8, 0))
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.345, 0.0725, 0.455), body)
    for (let i = 0; i < 240; i++) world.step()
    expect(body.translation().y).toBeCloseTo(1.4225, 2)
    expect(Math.abs(body.linvel().y)).toBeLessThan(0.01)
  })

  test('lets a carried book clear the new cap without flying through it', () => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 1.43, 0))
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.345, 0.0725, 0.455).setEnabled(false), body)
    const placement = new PropPlacement(world, body)
    world.step()
    for (let i = 0; i < 120; i++) {
      const destination = placement.constrain([0, 1.4, 1.8], [0, 1.2, 0.35])!
      expect(destination).not.toBeNull()
      const next = placement.follow(destination, 1 / 60)!
      expect(next).not.toBeNull()
      expect(placement.hasRoom(next, false)).toBe(true)
      body.setTranslation({x: next[0], y: next[1], z: next[2]}, false)
      world.step()
    }
    expect(body.translation().z).toBeGreaterThan(1)
  })

  for (const [x, z] of [[0, 1], [0, -1], [1, 0], [-1, 0], [-0.96, 0.28]] as const) {
    test(`picks up the settled three-part book from direction ${x}, ${z}, including after canceling`, () => {
      // Match the live spawn and separate pages/covers, not a single bounding box:
      // a cover spawned inside the cap can settle below it and trap the whole book.
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 1.43, 0).setCcdEnabled(true))
      for (const [width, height, depth, y] of [[0.64, 0.095, 0.86, 0], [0.69, 0.025, 0.91, -0.06], [0.69, 0.025, 0.91, 0.06]] as const) {
        world.createCollider(RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2).setTranslation(0, y, 0).setFriction(0.8).setRestitution(0.32), body)
      }
      const controller = new GrabbableBody(body, world)
      world.step()
      expect(controller.placement.hasRoom([body.translation().x, body.translation().y, body.translation().z])).toBe(true)
      for (let i = 0; i < 300; i++) world.step()
      expect(body.isSleeping()).toBe(true)
      expect(body.translation().y).toBeCloseTo(1.4225, 2)
      const resting = body.translation()
      for (let attempt = 0; attempt < 2; attempt++) {
        expect(controller.grab()).toBe(true)
        for (let i = 0; i < 120; i++) {
          controller.move([x * 1.8, 1.4, z * 1.8], [x * 0.35, 1.2, z * 0.35], 1 / 60)
          world.step()
        }
        const held = body.translation()
        expect(Math.hypot(held.x - resting.x, held.z - resting.z)).toBeGreaterThan(0.8)
        expect(controller.placement.hasRoom([held.x, held.y, held.z])).toBe(true)
        if (attempt === 0) {
          controller.cancel()
          expect(body.translation()).toEqual(resting)
        } else {
          expect(controller.release(true, [x, 0, z])).toBe(false)
          expect(body.isDynamic()).toBe(true)
          expect(body.linvel().y).toBe(2)
          for (let i = 0; i < body.numColliders(); i++) expect(body.collider(i).isEnabled()).toBe(true)
        }
      }
    })
  }

  test('owns and releases its geometry and uses a matte procedural stone material', () => {
    let disposed = 0
    for (const part of [geometry.stone, geometry.bronze, geometry.reveals]) part.addEventListener('dispose', () => disposed++)
    geometry.dispose()
    expect(disposed).toBe(3)
    const limestone = new LimestoneMaterial
    expect(limestone.colorNode).not.toBeNull()
    expect(limestone.roughnessNode).not.toBeNull()
    expect(limestone.metalness).toBe(0)
    expect(limestone.roughness).toBe(0.72)
    limestone.dispose()
  })
})

import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {Box3, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry} from '../../src/lib/gallery/architecture.ts'
import {EntranceGeometry} from '../../src/lib/gallery/EntranceGeometry.ts'
import {fountain} from '../../src/lib/gallery/fountain/config.ts'
import {FountainGeometry} from '../../src/lib/gallery/fountain/FountainGeometry.ts'
import {FountainSpray} from '../../src/lib/gallery/fountain/FountainSpray.ts'
import {lobby} from '../../src/lib/gallery/lobby.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import {FountainWaterMaterial} from '../../src/lib/materials/FountainWaterMaterial.ts'

await RAPIER.init()
describe('Lobby fountain', () => {
  test('the indexed basins and streams stay finite, below the ceiling and clear of the glass floor', () => {
    const geometry = new FountainGeometry
    try {
      expect(fountain.position[0]).toBe(0)
      const parts = [geometry.stone, geometry.brass, geometry.pools, geometry.streams]
      const bounds = new Box3
      for (const part of parts) {
        part.computeBoundingBox()
        bounds.union(part.boundingBox!)
        expect(part.index).not.toBeNull()
        for (const attribute of Object.values(part.attributes)) {
          expect([...attribute.array].every(Number.isFinite)).toBe(true)
        }
      }
      expect(parts.reduce((sum, part) => sum + triangleCount(part), 0)).toBeLessThan(55_000)
      expect(bounds.max.y).toBeLessThan(4.5)
      expect(bounds.max.y).toBeGreaterThan(4)
      expect(bounds.min.x).toBeCloseTo(-fountain.radius)
      expect(fountain.position[2] - fountain.radius).toBeGreaterThan(lobby.opening.center[1] + lobby.opening.size[1] / 2 + 1)
    } finally {
      geometry.dispose()
    }
  })
  test('the basin is hollow and uses the same carved mesh for physics and visible surfaces', () => {
    const geometry = new FountainGeometry
    const material = new MeshBasicMaterial
    const world = new RAPIER.World({
      x: 0,
      y: -9.81,
      z: 0,
    })
    try {
      world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(geometry.stone), RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES))
      world.step()
      const mesh = new Mesh(geometry.stone, material)
      for (const x of [0, 0.7, 1.5, 1.93, 2.1]) {
        const origin = new Vector3(x, 5, 0)
        const direction = new Vector3(0, -1, 0)
        const visual = new Raycaster(origin, direction).intersectObject(mesh)[0]
        const physical = world.castRay(new RAPIER.Ray(origin, direction), 6, true)
        expect(!!physical).toBe(!!visual)
        if (visual && physical) {
          expect(5 - physical.timeOfImpact).toBeCloseTo(visual.point.y, 4)
        }
      }
      const ball = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(1.5, 1.2, 0))
      world.createCollider(RAPIER.ColliderDesc.ball(0.1), ball)
      for (let i = 0; i < 240; i++) {
        world.step()
      }
      expect(ball.translation().y).toBeGreaterThan(0.4)
      expect(ball.translation().y).toBeLessThan(fountain.poolY)
      expect(ball.translation().x).toBeCloseTo(1.5, 2)
    } finally {
      world.free()
      material.dispose()
      geometry.dispose()
    }
  })
  test('water and spray are real animated node graphs, with transmission omitted in performance', () => {
    for (const stream of [false, true]) {
      for (const quality of [false, true]) {
        const material = new FountainWaterMaterial(stream, quality)
        expect(material.isMeshPhysicalNodeMaterial).toBe(true)
        expect(material.positionNode).not.toBeNull()
        expect(material.normalNode).not.toBeNull()
        expect(material.ior).toBeCloseTo(1.333)
        expect(material.transmission > 0).toBe(quality)
        material.dispose()
      }
    }
    const spray = new FountainSpray
    expect(spray.count).toBe(fountain.sprayCount)
    expect(spray.frustumCulled).toBe(false)
    expect(spray.material.positionNode).not.toBeNull()
    for (const name of ['sprayOrigin', 'sprayVelocity', 'sprayPhase', 'sprayLifetime']) {
      const attribute = spray.geometry.getAttribute(name)
      expect(attribute.count).toBe(fountain.sprayCount)
      expect([...attribute.array].every(Number.isFinite)).toBe(true)
    }
    spray.dispose()
  })
})
test('the grand entrance is finite, arched and entirely within the north wall', () => {
  const geometry = new EntranceGeometry
  try {
    const bounds = new Box3
    for (const part of [geometry.leaves, geometry.frame, geometry.metal]) {
      part.computeBoundingBox()
      bounds.union(part.boundingBox!)
      for (const attribute of Object.values(part.attributes)) {
        expect([...attribute.array].every(Number.isFinite)).toBe(true)
      }
    }
    expect(bounds.max.x).toBeLessThan(2.2)
    expect(bounds.max.y).toBeLessThan(5.3)
    expect(bounds.max.y).toBeGreaterThan(5)
    expect(bounds.min.z).toBeGreaterThanOrEqual(0)
  } finally {
    geometry.dispose()
  }
})

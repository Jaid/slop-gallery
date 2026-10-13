import type {BufferGeometry} from 'three/webgpu'

import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {Box3, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry} from '../../src/lib/gallery/architecture.ts'
import EntranceGeometry from '../../src/lib/gallery/EntranceGeometry.ts'
import {fountainBench, fountainBenches} from '../../src/lib/gallery/fountain/benches.ts'
import fountain, {sheetFlightTime, sheetLanding, sheetPoint} from '../../src/lib/gallery/fountain/config.ts'
import FountainGeometry from '../../src/lib/gallery/fountain/FountainGeometry.ts'
import FountainSpray, {fountainDroplets} from '../../src/lib/gallery/fountain/FountainSpray.ts'
import lobby from '../../src/lib/gallery/lobby.ts'
import RevolvedProfileGeometry from '../../src/lib/gallery/RevolvedProfileGeometry.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import FountainStoneMaterial from '../../src/lib/materials/FountainStoneMaterial.ts'
import FountainWaterMaterial from '../../src/lib/materials/FountainWaterMaterial.ts'

await RAPIER.init()
const down = new Vector3(0, -1, 0)
/** Every face’s winding agrees with its shading normals, so single-sided materials and shadows see the outside. */
function frontFacesMatchNormals(geometry: BufferGeometry) {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const index = geometry.index!
  const [a, b, c, face, shading, n] = Array.from({length: 6}, () => new Vector3)
  for (let i = 0; i < index.count; i += 3) {
    a.fromBufferAttribute(position, index.getX(i))
    b.fromBufferAttribute(position, index.getX(i + 1)).sub(a)
    c.fromBufferAttribute(position, index.getX(i + 2)).sub(a)
    face.crossVectors(b, c)
    shading.set(0, 0, 0)
    for (let j = 0; j < 3; j++) {
      shading.add(n.fromBufferAttribute(normal, index.getX(i + j)))
    }
    if (face.dot(shading) <= 0) {
      return false
    }
  }
  return true
}
describe('revolved profiles', () => {
  test('octagon sides sit exactly at the profile’s apothem, with hard carved corners', () => {
    const geometry = new RevolvedProfileGeometry([[0, 1], [1, 1], [1, 0]], {sides: 8})
    try {
      const mesh = new Mesh(geometry, new MeshBasicMaterial)
      const side = new Raycaster(new Vector3(3, 0.5, 0.2), new Vector3(-1, 0, 0)).intersectObject(mesh)[0]
      expect(side.point.x).toBeCloseTo(1, 6)
      expect(side.face!.normal.x).toBeCloseTo(1, 6)
      const position = geometry.getAttribute('position')
      const corners = Array.from({length: position.count}, (_, i) => Math.hypot(position.getX(i), position.getZ(i)))
      expect(Math.max(...corners)).toBeCloseTo(1 / Math.cos(Math.PI / 8), 6)
      // Each flat side keeps its own normals: 8 sides × (wall quad + cap triangle) with no shared corner normals.
      const normal = geometry.getAttribute('normal')
      for (let i = 0; i < normal.count; i++) {
        const horizontal = Math.hypot(normal.getX(i), normal.getZ(i))
        expect(horizontal < 1e-6 || Math.abs(horizontal - 1) < 1e-6).toBe(true)
      }
      expect(frontFacesMatchNormals(geometry)).toBe(true)
      expect(triangleCount(geometry)).toBe(8 * 3)
    } finally {
      geometry.dispose()
    }
  })
  test('fine polygons shade round, and gentle profile bends shade smooth', () => {
    const geometry = new RevolvedProfileGeometry([[0, 0], [1, 0.05], [1.2, 0.15]], {sides: 32})
    try {
      // A vertex shared by neighboring sides is shaded along the radius through it, not along either side.
      expect(geometry.getAttribute('position').count).toBeLessThan(32 * 3 + 3)
      const position = geometry.getAttribute('position')
      const normal = geometry.getAttribute('normal')
      for (let i = 0; i < position.count; i++) {
        const radius = Math.hypot(position.getX(i), position.getZ(i))
        if (radius < 1e-6) {
          continue
        }
        const horizontal = Math.hypot(normal.getX(i), normal.getZ(i))
        if (horizontal > 1e-6) {
          expect(Math.abs(position.getX(i) * normal.getX(i) + position.getZ(i) * normal.getZ(i)) / radius / horizontal).toBeCloseTo(1, 6)
        }
      }
      expect(frontFacesMatchNormals(geometry)).toBe(true)
    } finally {
      geometry.dispose()
    }
  })
  test('invalid profiles are rejected', () => {
    expect(() => new RevolvedProfileGeometry([[0, 0]], {sides: 8})).toThrow(RangeError)
    expect(() => new RevolvedProfileGeometry([[0, 0], [-1, 0]], {sides: 8})).toThrow(RangeError)
    expect(() => new RevolvedProfileGeometry([[0, 0], [1, 0]], {sides: 2})).toThrow(RangeError)
  })
})
describe('Lobby fountain', () => {
  test('the octagonal fountain is lean, finite, below the ceiling and clear of the glass floor and benches', () => {
    const geometry = new FountainGeometry
    try {
      expect(fountain.position[0]).toBe(0)
      const parts = [geometry.stone, geometry.brass, geometry.pools, geometry.water]
      const bounds = new Box3
      for (const part of parts) {
        part.computeBoundingBox()
        bounds.union(part.boundingBox!)
        expect(part.index).not.toBeNull()
        for (const attribute of Object.values(part.attributes)) {
          expect([...attribute.array].every(Number.isFinite)).toBe(true)
        }
      }
      // The previous fountain needed about 32k triangles; the stone alone was 8k.
      expect(parts.reduce((sum, part) => sum + triangleCount(part), 0)).toBeLessThan(5000)
      expect(triangleCount(geometry.stone)).toBeLessThan(2500)
      expect(bounds.max.y).toBeGreaterThan(2.5)
      expect(bounds.max.y).toBeLessThan(3.2)
      // Flat sides face the benches along x and z.
      expect(bounds.max.x).toBeCloseTo(fountain.basinApothem, 5)
      expect(bounds.min.z).toBeCloseTo(-fountain.basinApothem, 5)
      expect(fountain.position[2] - fountain.radius).toBeGreaterThan(lobby.opening.center[1] + lobby.opening.size[1] / 2 + 1)
      expect(fountainBench.radius - fountainBench.depth / 2 - fountain.basinApothem).toBeGreaterThan(1.4)
      expect(fountainBenches).toHaveLength(4)
    } finally {
      geometry.dispose()
    }
  })
  test('stone and nozzle are closed toward the outside, so shadows and single-sided shading stay correct', () => {
    const geometry = new FountainGeometry
    try {
      expect(frontFacesMatchNormals(geometry.stone)).toBe(true)
      expect(frontFacesMatchNormals(geometry.brass)).toBe(true)
    } finally {
      geometry.dispose()
    }
  })
  test('each pool brims at its lip and each veil lands inside the pool below', () => {
    const {veils, pools, basinInnerApothem} = fountain
    const geometry = new FountainGeometry
    const material = new MeshBasicMaterial
    try {
      const stone = new Mesh(geometry.stone, material)
      const lip = (radius: number) => new Raycaster(new Vector3(radius, 5, 0.013), down).intersectObject(stone)[0]?.point.y ?? Number.NaN
      for (const [sheet, pool] of [[veils.tazza, pools.tazza], [veils.cup, pools.cup]] as const) {
        expect(sheet.y).toBe(pool)
        // Water fills the bowl and brims a few millimeters over the lip it spills from.
        const crest = Math.max(...Array.from({length: 41}, (_, i) => lip(sheet.radius - 0.04 + i * 0.001)))
        expect(crest).toBeLessThan(pool)
        expect(crest).toBeGreaterThan(pool - 0.012)
        expect(lip(sheet.radius + 0.004)).toBeLessThan(pool)
        expect(sheetFlightTime(sheet)).toBeGreaterThan(0)
      }
      expect(sheetLanding(veils.cup)).toBeLessThan(veils.tazza.radius - 0.2)
      expect(sheetLanding(veils.tazza)).toBeLessThan(basinInnerApothem - 0.2)
      // Veils must pass outside the bowl below them rather than through its stone.
      for (const [sheet, clearOf] of [[veils.cup, 0.21], [veils.tazza, 0.4]] as const) {
        const duration = sheetFlightTime(sheet)
        for (let i = 1; i <= 20; i++) {
          const [radius, y] = sheetPoint(sheet, duration * i / 20)
          const surface = lip(radius)
          if (radius > clearOf) {
            expect(Number.isNaN(surface) || surface < y + 1e-6).toBe(true)
          }
        }
      }
      // The pools’ water surfaces are where the material and the physics expect them.
      const water = new Mesh(geometry.pools, material)
      for (const [radius, y] of [[1.4, pools.basin], [0.7, pools.tazza], [0.2, pools.cup]]) {
        expect(new Raycaster(new Vector3(radius, 5, 0.013), down).intersectObject(water)[0].point.y).toBeCloseTo(y, 6)
      }
    } finally {
      material.dispose()
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
      for (const x of [0, 0.3, 0.7, 1.3, 1.75, 1.93, 2.1]) {
        const origin = new Vector3(x, 5, 0.013)
        const visual = new Raycaster(origin, down).intersectObject(mesh)[0]
        const physical = world.castRay(new RAPIER.Ray(origin, down), 6, true)
        expect(!!physical).toBe(!!visual)
        if (visual && physical) {
          expect(5 - physical.timeOfImpact).toBeCloseTo(visual.point.y, 4)
        }
      }
      const ball = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(1.3, 1, 0))
      world.createCollider(RAPIER.ColliderDesc.ball(0.1), ball)
      for (let i = 0; i < 240; i++) {
        world.step()
      }
      expect(ball.translation().y).toBeCloseTo(fountain.basinFloor + 0.1, 2)
      expect(ball.translation().y).toBeLessThan(fountain.poolY)
      expect(ball.translation().x).toBeCloseTo(1.3, 2)
    } finally {
      world.free()
      material.dispose()
      geometry.dispose()
    }
  })
  test('water and spray are real animated node graphs, with transmission omitted in fast mode', () => {
    for (const falling of [false, true]) {
      for (const heavy of [false, true]) {
        const material = new FountainWaterMaterial(falling, heavy)
        expect(material.isMeshPhysicalNodeMaterial).toBe(true)
        expect(material.positionNode).not.toBeNull()
        expect(material.normalNode).not.toBeNull()
        expect(material.opacityNode !== null).toBe(falling)
        expect(material.ior).toBeCloseTo(1.333)
        expect(material.transmission > 0).toBe(heavy)
        material.dispose()
      }
    }
    const stone = new FountainStoneMaterial
    expect(stone.colorNode).not.toBeNull()
    expect(stone.roughnessNode).not.toBeNull()
    stone.dispose()
    const geometry = new FountainGeometry
    try {
      for (const name of ['waterFall', 'waterAir']) {
        const attribute = geometry.water.getAttribute(name)
        expect(attribute.count).toBe(geometry.water.getAttribute('position').count)
        expect([...attribute.array].every(value => value >= 0 && value <= 1)).toBe(true)
      }
      expect(geometry.pools.getAttribute('splashRadius').count).toBe(geometry.pools.getAttribute('position').count)
    } finally {
      geometry.dispose()
    }
    const spray = new FountainSpray
    expect(spray.count).toBe(fountain.sprayCount)
    expect(spray.frustumCulled).toBe(false)
    expect(spray.material.positionNode).not.toBeNull()
    for (const name of ['sprayOrigin', 'sprayVelocity', 'sprayPhase', 'sprayLifetime', 'spraySize']) {
      const attribute = spray.geometry.getAttribute(name)
      expect(attribute.count).toBe(fountain.sprayCount)
      expect([...attribute.array].every(Number.isFinite)).toBe(true)
    }
    for (const value of spray.geometry.getAttribute('sprayLifetime').array) {
      expect(value).toBeGreaterThan(0)
    }
    spray.dispose()
  })
  test('droplets fall back into the fountain’s own water', () => {
    const {gravity, basinInnerApothem} = fountain
    for (const {origin, velocity, until} of fountainDroplets()) {
      const lifetime = (velocity[1] + Math.sqrt(velocity[1] ** 2 + 2 * gravity * (origin[1] - until))) / gravity
      const landing = Math.hypot(origin[0] + velocity[0] * lifetime, origin[2] + velocity[2] * lifetime)
      const pool = until === fountain.pools.cup ? fountain.veils.cup.radius : (until === fountain.pools.tazza ? fountain.veils.tazza.radius : basinInnerApothem)
      expect(landing).toBeLessThan(pool)
    }
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

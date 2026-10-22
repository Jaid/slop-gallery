import type {BufferAttribute, BufferGeometry} from 'three/webgpu'

import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {Box3, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry} from '../../src/lib/gallery/architecture.ts'
import EntranceGeometry from '../../src/lib/gallery/EntranceGeometry.ts'
import {fountainBench, fountainBenches} from '../../src/lib/gallery/fountain/benches.ts'
import fountain, {arcPoint, basinRadius, jetAngle, ribbonSheet, sheetFlightTime, sheetLanding, sheetPoint, spoutAngle, spoutOpening} from '../../src/lib/gallery/fountain/config.ts'
import FountainGeometry from '../../src/lib/gallery/fountain/FountainGeometry.ts'
import FountainSpray, {fountainDroplets} from '../../src/lib/gallery/fountain/FountainSpray.ts'
import lobby from '../../src/lib/gallery/lobby.ts'
import {lobbyChandeliers} from '../../src/lib/gallery/lobbyVault.ts'
import RevolvedProfileGeometry from '../../src/lib/gallery/RevolvedProfileGeometry.ts'
import ShapedLatheGeometry from '../../src/lib/gallery/ShapedLatheGeometry.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import FountainStoneMaterial from '../../src/lib/materials/FountainStoneMaterial.ts'
import {FallingWaterMaterial, lobbyEnvironment, lobbyRadiance, PoolWaterMaterial, waterAbsorption, waterIor, waterReflectance} from '../../src/lib/materials/water/index.ts'

await RAPIER.init()
const down = new Vector3(0, -1, 0)
const luminance = ([r, g, b]: readonly [number, number, number]) => 0.2126 * r + 0.7152 * g + 0.0722 * b
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
      const sideRay = new Raycaster(new Vector3(3, 0.5, 0.2), new Vector3(-1, 0, 0))
      const side = sideRay.intersectObject(mesh)[0]
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
describe('shaped lathes', () => {
  test('a plain profile revolves into a smooth, closed and outward-shaded surface', () => {
    const geometry = new ShapedLatheGeometry([[0, 1], [1, 1], [1, 0]], {segments: 32})
    try {
      expect(frontFacesMatchNormals(geometry)).toBe(true)
      // The rim is a hard arris: the cap and the wall keep separate normals there.
      const position = geometry.getAttribute('position')
      const normal = geometry.getAttribute('normal')
      for (let i = 0; i < position.count; i++) {
        expect(Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i))).toBeCloseTo(1, 6)
        const radius = Math.hypot(position.getX(i), position.getZ(i))
        if (position.getY(i) < 0.999 && radius > 0.5) {
          // On the wall, normals point straight away from the axis, so a round shaft shades round.
          expect((position.getX(i) * normal.getX(i) + position.getZ(i) * normal.getZ(i)) / radius).toBeCloseTo(1, 4)
        }
      }
    } finally {
      geometry.dispose()
    }
  })
  test('shaping moves the surface per angle, and its normals follow the shaped surface', () => {
    const lobes = 6
    const geometry = new ShapedLatheGeometry([[0, 1], [1, 1], [1, 0]], {
      segments: 96,
      shape: (point, angle) => [point === 0 ? 0 : 1 + 0.1 * Math.cos(lobes * angle), point === 0 ? 1 : [1, 1, 0][point]],
    })
    try {
      expect(frontFacesMatchNormals(geometry)).toBe(true)
      const mesh = new Mesh(geometry, new MeshBasicMaterial)
      for (const angle of [0, Math.PI / lobes, 0.3]) {
        const direction = new Vector3(-Math.cos(angle), 0, -Math.sin(angle))
        const hitRay = new Raycaster(direction.clone().multiplyScalar(-3).setY(0.5), direction)
        const hit = hitRay.intersectObject(mesh)[0]
        expect(Math.hypot(hit.point.x, hit.point.z)).toBeCloseTo(1 + 0.1 * Math.cos(lobes * angle), 2)
      }
      // Halfway up a lobe’s flank the wall turns, so its normal leans around the axis instead of pointing away from it.
      const position = geometry.getAttribute('position')
      const normal = geometry.getAttribute('normal')
      let leaning = 0
      for (let i = 0; i < position.count; i++) {
        const angle = Math.atan2(position.getZ(i), position.getX(i))
        if (position.getY(i) >= 0.5 || Math.abs(Math.sin(lobes * angle)) <= 0.9) {
          continue
        }
        const tangential = -Math.sin(angle) * normal.getX(i) + Math.cos(angle) * normal.getZ(i)
        leaning = Math.max(leaning, Math.abs(tangential))
      }
      expect(leaning).toBeGreaterThan(0.3)
    } finally {
      geometry.dispose()
    }
  })
  test('invalid lathes are rejected', () => {
    expect(() => new ShapedLatheGeometry([[0, 0]], {segments: 8})).toThrow(RangeError)
    expect(() => new ShapedLatheGeometry([[0, 0], [-1, 0]], {segments: 8})).toThrow(RangeError)
    expect(() => new ShapedLatheGeometry([[0, 0], [1, 0]], {segments: 2})).toThrow(RangeError)
  })
})
describe('Lobby fountain', () => {
  test('the fountain is finite, within its polygon budget, below the vault and clear of the glass floor and benches', () => {
    const geometry = new FountainGeometry
    try {
      expect(fountain.position[0]).toBe(0)
      const parts = [geometry.stone, geometry.gilt, geometry.pools, geometry.water]
      const bounds = new Box3
      for (const part of parts) {
        part.computeBoundingBox()
        bounds.union(part.boundingBox!)
        expect(part.index).not.toBeNull()
        for (const attribute of Object.values(part.attributes) as Array<BufferAttribute>) {
          expect([...attribute.array].every(Number.isFinite)).toBe(true)
        }
      }
      // About 23k triangles, a fraction of one of the Lobby’s chandeliers; the stone carries most of them.
      expect(parts.reduce((sum, part) => sum + triangleCount(part), 0)).toBeLessThan(26_000)
      expect(triangleCount(geometry.stone)).toBeLessThan(15_000)
      // The jet’s solid column ends below 4 m; its droplets rise a little higher, still far below the chandeliers.
      expect(bounds.max.y).toBeGreaterThan(3.4)
      expect(bounds.max.y).toBeLessThan(4.2)
      expect(fountain.jet.y + fountain.jet.speed ** 2 / (2 * fountain.gravity)).toBeLessThan(lobbyChandeliers.y - 3)
      // The round step is the widest part.
      expect(bounds.max.x).toBeCloseTo(fountain.radius, 5)
      expect(bounds.min.z).toBeCloseTo(-fountain.radius, 2)
      expect(fountain.position[2] - fountain.radius).toBeGreaterThan(lobby.opening.center[1] + lobby.opening.size[1] / 2 + 1)
      expect(fountainBench.radius - fountainBench.depth / 2 - fountain.radius).toBeGreaterThan(1.4)
      expect(fountainBenches).toHaveLength(4)
    } finally {
      geometry.dispose()
    }
  })
  test('stone and gilt are closed toward the outside, so shadows and single-sided shading stay correct', () => {
    const geometry = new FountainGeometry
    try {
      expect(frontFacesMatchNormals(geometry.stone)).toBe(true)
      expect(frontFacesMatchNormals(geometry.gilt)).toBe(true)
    } finally {
      geometry.dispose()
    }
  })
  test('the basin follows its lobed plan, and every pool’s water meets its stone', () => {
    const {basin, pools, tazza, cup} = fountain
    const geometry = new FountainGeometry
    const material = new MeshBasicMaterial
    try {
      const stone = new Mesh(geometry.stone, material)
      const water = new Mesh(geometry.pools, material)
      for (const angle of [0, Math.PI / 8, 0.2, 1.1]) {
        // Cast from the axis outward at mid height of the pool: the first stone is the basin’s inner wall.
        const outward = new Vector3(Math.cos(angle), 0, Math.sin(angle))
        const inside = new Vector3(0, (basin.floor + pools.basin) / 2, 0)
        inside.addScaledVector(outward, fountain.plinth.apothem + 0.2)
        const wallRay = new Raycaster(inside, outward)
        const wall = wallRay.intersectObject(stone)[0]
        expect(Math.hypot(wall.point.x, wall.point.z)).toBeCloseTo(basinRadius(angle), 2)
        // The water reaches into the wall rather than leaving a sliver beside it.
        const above = new Vector3(0, 5, 0)
        above.addScaledVector(outward, basinRadius(angle) - 0.004)
        const edgeRay = new Raycaster(above, down)
        expect(edgeRay.intersectObject(water)[0]?.point.y).toBeCloseTo(pools.basin, 6)
      }
      // The pools’ water surfaces are where the material and the physics expect them.
      for (const [radius, y] of [[1.4, pools.basin], [0.7, pools.tazza], [0.2, pools.cup], [tazza.innerRadius - 0.01, pools.tazza], [cup.innerRadius - 0.01, pools.cup]]) {
        const surfaceRay = new Raycaster(new Vector3(radius, 5, 0.013), down)
        expect(surfaceRay.intersectObject(water)[0].point.y).toBeCloseTo(y, 6)
      }
    } finally {
      material.dispose()
      geometry.dispose()
    }
  })
  test('the cup brims all around, the tazza only through its spouts, and the basin holds its water', () => {
    const {basin, pools, tazza, cup, veil} = fountain
    const geometry = new FountainGeometry
    const material = new MeshBasicMaterial
    try {
      const stone = new Mesh(geometry.stone, material)
      /** the highest stone at a distance from the axis and an angle */
      const crest = (from: number, to: number, angle: number) => Math.max(...Array.from({length: 41}, (_, i) => {
        const radius = from + (to - from) * i / 40
        const crestRay = new Raycaster(new Vector3(radius * Math.cos(angle), 5, radius * Math.sin(angle)), down)
        return crestRay.intersectObject(stone)[0]?.point.y ?? Number.NEGATIVE_INFINITY
      }))
      for (const angle of [0, 0.4, 2]) {
        expect(crest(cup.innerRadius - 0.02, cup.radius + 0.02, angle)).toBeLessThan(pools.cup)
        expect(crest(cup.innerRadius - 0.02, cup.radius + 0.02, angle)).toBeGreaterThan(pools.cup - 0.012)
        expect(crest(basin.radius, basin.radius + basin.coping, angle)).toBeGreaterThan(pools.basin + 0.08)
      }
      for (let i = 0; i < fountain.spouts; i++) {
        // Through a spout the lip dips below the water; between spouts it stands above it.
        expect(spoutOpening(spoutAngle(i))).toBeCloseTo(1, 6)
        expect(crest(tazza.innerRadius - 0.02, tazza.radius + 0.02, spoutAngle(i))).toBeLessThan(pools.tazza)
        expect(spoutOpening(jetAngle(i))).toBe(0)
        expect(crest(tazza.innerRadius - 0.02, tazza.radius + 0.02, jetAngle(i))).toBeGreaterThan(pools.tazza + 0.01)
      }
      expect(veil.y).toBe(pools.cup)
      expect(veil.until).toBe(pools.tazza)
    } finally {
      material.dispose()
      geometry.dispose()
    }
  })
  test('all falling water lands in the pool below, clear of the stone on its way', () => {
    const {arc, basin, plinth, pools, tazza, veil} = fountain
    const geometry = new FountainGeometry
    const material = new MeshBasicMaterial
    try {
      const stone = new Mesh(geometry.stone, material)
      const surfaceBelow = (radius: number, angle: number, y: number) => {
        const surfaceRay = new Raycaster(new Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle)), down)
        return surfaceRay.intersectObject(stone)[0]?.point.y ?? Number.NEGATIVE_INFINITY
      }
      // The veil passes outside the cup and lands in the tazza, clear of the stem.
      expect(sheetLanding(veil)).toBeGreaterThan(0.3)
      expect(sheetLanding(veil)).toBeLessThan(tazza.innerRadius - 0.2)
      // Ribbons land in the basin, between the plinth and the wall.
      expect(sheetLanding(ribbonSheet)).toBeGreaterThan(plinth.apothem / Math.cos(Math.PI / 8) + 0.3)
      expect(sheetLanding(ribbonSheet)).toBeLessThan(fountain.basinInnerRadius - 0.15)
      for (let i = 0; i < fountain.spouts; i++) {
        const angle = spoutAngle(i)
        const duration = sheetFlightTime(ribbonSheet)
        for (let j = 1; j <= 20; j++) {
          const [radius, y] = sheetPoint(ribbonSheet, duration * j / 20)
          expect(surfaceBelow(radius, angle, y + 0.003)).toBeLessThan(y)
        }
      }
      // The arcing jets leave the coping, pass under the tazza and land in front of the plinth.
      expect(arc.to[1]).toBe(pools.basin)
      expect(arc.from[0]).toBeGreaterThan(basin.radius + basin.lobe)
      expect(arc.to[0]).toBeGreaterThan(plinth.apothem / Math.cos(Math.PI / 8) + 0.15)
      for (let i = 0; i < fountain.lobes; i++) {
        const angle = jetAngle(i)
        for (let j = 1; j < 30; j++) {
          const [radius, y] = arcPoint(arc, arc.duration * j / 30)
          const clearance = fountain.arcRadius + 0.01
          expect(surfaceBelow(radius, angle, y - clearance)).toBeLessThan(y - clearance)
          // Nothing hangs just above the stream either.
          const aboveRay = new Raycaster(new Vector3(radius * Math.cos(angle), y + clearance, radius * Math.sin(angle)), new Vector3(0, 1, 0), 0, 0.1)
          expect(aboveRay.intersectObject(stone)).toHaveLength(0)
        }
      }
      // Arcs and ribbons alternate around the fountain, never crossing.
      expect(Math.abs(jetAngle(0) - spoutAngle(0))).toBeCloseTo(Math.PI / fountain.spouts, 6)
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
      // Rays run a little off the axis planes: lathe edges lie in them, and a ray grazing exactly along an edge is a degenerate case for Rapier.
      for (const x of [0.004, 0.3, 0.7, 1.2, 1.45, 1.75, 1.95, 2.1]) {
        const origin = new Vector3(x, 5, 0.017)
        const visualRay = new Raycaster(origin, down)
        const visual = visualRay.intersectObject(mesh).at(0)
        const physical = world.castRay(new RAPIER.Ray(origin, down), 6, true)
        expect(!!physical).toBe(!!visual)
        if (visual && physical) {
          expect(5 - physical.timeOfImpact).toBeCloseTo(visual.point.y, 3)
        }
      }
      const ball = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(1.25, 1, 0.3))
      world.createCollider(RAPIER.ColliderDesc.ball(0.1), ball)
      for (let i = 0; i < 240; i++) {
        world.step()
      }
      expect(ball.translation().y).toBeCloseTo(fountain.basinFloor + 0.1, 2)
      expect(ball.translation().y).toBeLessThan(fountain.poolY)
    } finally {
      world.free()
      material.dispose()
      geometry.dispose()
    }
  })
  test('the water geometry carries the per-vertex flow data its materials read', () => {
    const geometry = new FountainGeometry
    try {
      const count = geometry.water.getAttribute('position').count
      for (const name of ['waterFall', 'waterAir', 'waterLens']) {
        const attribute = geometry.water.getAttribute(name)
        expect(attribute.count).toBe(count)
        expect([...attribute.array].every(value => value >= 0 && value <= 1)).toBe(true)
      }
      // Round streams act as lenses; the thin veil does not.
      const lens = [...geometry.water.getAttribute('waterLens').array]
      expect(lens).toContain(0)
      expect(lens).toContain(1)
      for (const name of ['splashRing', 'splashPoints']) {
        expect(geometry.pools.getAttribute(name).count).toBe(geometry.pools.getAttribute('position').count)
      }
    } finally {
      geometry.dispose()
    }
  })
  test('water materials are real animated node graphs; the pools refract only in heavy mode', () => {
    for (const heavy of [false, true]) {
      const pool = new PoolWaterMaterial(heavy)
      expect(pool.isMeshPhysicalNodeMaterial).toBe(true)
      expect(pool.normalNode).not.toBeNull()
      expect(pool.colorNode).not.toBeNull()
      expect(pool.ior).toBeCloseTo(waterIor)
      // Heavy pools show the refracted backdrop as their transmitted light; fast pools blend a tinted veil over the stone.
      expect(pool.emissiveNode !== null).toBe(heavy)
      expect(pool.opacityNode !== null).toBe(!heavy)
      expect(pool.envMap).toBe(lobbyEnvironment)
      pool.dispose()
      const falling = new FallingWaterMaterial(heavy)
      expect(falling.positionNode).not.toBeNull()
      expect(falling.normalNode).not.toBeNull()
      expect(falling.opacityNode).not.toBeNull()
      expect(falling.maskNode).not.toBeNull()
      expect(falling.depthWrite).toBe(false)
      expect(falling.envMap).toBe(lobbyEnvironment)
      falling.dispose()
    }
    const stone = new FountainStoneMaterial
    expect(stone.colorNode).not.toBeNull()
    expect(stone.roughnessNode).not.toBeNull()
    stone.dispose()
  })
  test('water absorbs red first and grows darker with depth', () => {
    expect(waterAbsorption[0]).toBeGreaterThan(waterAbsorption[1])
    expect(waterAbsorption[0]).toBeGreaterThan(waterAbsorption[2])
    expect(waterReflectance).toBeCloseTo(0.02, 2)
  })
  test('the mirrored Lobby is bright, finite and brightest toward the sky and the candles', () => {
    const pixels = lobbyEnvironment.image.data as Float32Array
    expect([...pixels].every(Number.isFinite)).toBe(true)
    expect(Math.min(...pixels.filter((_, i) => i % 4 !== 3))).toBeGreaterThan(0.1)
    const floor = luminance(lobbyRadiance(0.3, -0.9, 0.3))
    const wall = luminance(lobbyRadiance(1, 0.05, 0))
    const sky = luminance(lobbyRadiance(0.1, 0.99, 0.05))
    expect(wall).toBeGreaterThan(floor)
    expect(sky).toBeGreaterThan(wall)
  })
  test('spray fits WebGPU’s vertex buffer limit and every droplet falls back into the fountain’s own water', () => {
    const spray = new FountainSpray
    try {
      expect(spray.count).toBe(fountain.sprayCount)
      expect(spray.frustumCulled).toBe(false)
      expect(spray.material.positionNode).not.toBeNull()
      // Motion vectors add buffers of their own, so the drop’s attributes share as few as possible.
      const buffers = new Set(Object.values(spray.geometry.attributes).map(attribute => ('data' in attribute ? attribute.data : attribute)))
      expect(buffers.size + 1).toBeLessThanOrEqual(4)
      for (const name of ['sprayOrigin', 'sprayVelocity', 'sprayPhase', 'sprayLifetime', 'spraySize']) {
        const attribute = spray.geometry.getAttribute(name)
        expect(attribute.count).toBe(fountain.sprayCount)
        for (let i = 0; i < attribute.count; i++) {
          expect(Number.isFinite(attribute.getX(i))).toBe(true)
        }
      }
      const lifetime = spray.geometry.getAttribute('sprayLifetime')
      for (let i = 0; i < lifetime.count; i++) {
        expect(lifetime.getX(i)).toBeGreaterThan(0)
      }
    } finally {
      spray.dispose()
    }
    const {gravity, pools, tazza, cup} = fountain
    for (const {origin, velocity, until} of fountainDroplets()) {
      const lifetime = (velocity[1] + Math.sqrt(velocity[1] ** 2 + 2 * gravity * (origin[1] - until))) / gravity
      const [x, z] = [origin[0] + velocity[0] * lifetime, origin[2] + velocity[2] * lifetime]
      const landing = Math.hypot(x, z)
      if (until === pools.cup) {
        expect(landing).toBeLessThan(cup.innerRadius)
      } else if (until === pools.tazza) {
        expect(landing).toBeLessThan(tazza.innerRadius)
      } else {
        expect(until).toBe(pools.basin)
        expect(landing).toBeLessThan(basinRadius(Math.atan2(z, x)))
      }
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

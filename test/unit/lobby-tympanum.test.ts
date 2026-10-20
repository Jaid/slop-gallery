import {afterAll, describe, expect, test} from 'bun:test'

import {BufferGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import LobbyTympanumGeometry, {lobbyTympanum} from '../../src/lib/gallery/LobbyTympanumGeometry.ts'
import lobbyVault from '../../src/lib/gallery/lobbyVault.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import CelestialMosaicMaterial from '../../src/lib/materials/CelestialMosaicMaterial.ts'

const geometry = new LobbyTympanumGeometry
const parts = [geometry.field, geometry.stone, geometry.gold]
const material = new MeshBasicMaterial
const collision = geometry.collision()
const physical = new BufferGeometry
physical.setAttribute('position', new Float32BufferAttribute(collision[0], 3))
physical.setIndex([...collision[1]])
const meshes = parts.map(part => new Mesh(part, material))
const collider = new Mesh(physical, material)
for (const mesh of [...meshes, collider]) {
  mesh.updateMatrixWorld()
}
afterAll(() => {
  geometry.dispose()
  physical.dispose()
  material.dispose()
})
const positionKey = (position: Vector3) => [position.x, position.y, position.z].map(value => Math.round(value * 1e5)).join(':')
const readVector = (attribute: ReturnType<BufferGeometry['getAttribute']>, index: number) => {
  const vector = new Vector3
  return vector.fromBufferAttribute(attribute, index)
}
const positionKeys = (part: BufferGeometry) => {
  const attribute = part.getAttribute('position')
  return new Set(Array.from({length: attribute.count}, (_, i) => positionKey(readVector(attribute, i))))
}
describe('the Lobby’s celestial tympanum', () => {
  test('has three merged material batches and fewer than 8000 triangles', () => {
    expect(parts).toHaveLength(3)
    expect(parts.every(part => part.index && !part.groups.length)).toBe(true)
    const count = parts.reduce((sum, part) => sum + triangleCount(part), 0)
    expect(count).toBeGreaterThan(1000)
    expect(count).toBeLessThan(8000)
  })
  test('sits on the south cornice, clear of the existing vault ribs and everything below', () => {
    expect(lobbyTympanum.wallZ).toBe(lobbyVault.halfLength)
    expect(geometry.stone.boundingBox!.min.y).toBeCloseTo(lobbyVault.springY, 5)
    for (const part of parts) {
      const positions = part.getAttribute('position')
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i)
        const y = positions.getY(i)
        const z = positions.getZ(i)
        expect(y).toBeGreaterThanOrEqual(lobbyVault.springY - 1e-5)
        expect(Math.hypot(x, y - lobbyVault.springY)).toBeLessThan(lobbyVault.radius - lobbyVault.rib.depth - 0.05)
        // Positive local z turns inward at the south wall, never into the future room behind it.
        expect(z).toBeGreaterThan(0)
        expect(z).toBeLessThan(0.38)
      }
    }
  })
  test('the opaque blue field closes its own perimeter', () => {
    const part = geometry.field
    const positions = part.getAttribute('position')
    const edges = new Map<string, number>
    for (let i = 0; i < part.index!.count; i += 3) {
      const keys = [0, 1, 2].map(offset => positionKey(readVector(positions, part.index!.getX(i + offset))))
      for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
        const key = [keys[a], keys[b]].toSorted().join('/')
        edges.set(key, (edges.get(key) ?? 0) + 1)
      }
    }
    expect(edges.values().every(count => count === 2)).toBe(true)
  })
  test('all relief triangles have finite attributes, area and outward shading normals', () => {
    for (const part of parts) {
      const positions = part.getAttribute('position')
      const normals = part.getAttribute('normal')
      for (const attribute of Object.values(part.attributes)) {
        expect([...attribute.array].every(Number.isFinite)).toBe(true)
      }
      for (let i = 0; i < part.index!.count; i += 3) {
        const ids = [0, 1, 2].map(offset => part.index!.getX(i + offset))
        const [a, b, c] = ids.map(id => readVector(positions, id))
        const face = b.sub(a).cross(c.sub(a))
        const shading = ids.reduce((sum, id) => sum.add(readVector(normals, id)), new Vector3)
        expect(face.length()).toBeGreaterThan(1e-8)
        expect(face.normalize().dot(shading.normalize())).toBeGreaterThan(0.8)
      }
    }
  })
  test('the sunburst and paired laurel sprays are bilaterally balanced', () => {
    const keys = positionKeys(geometry.gold)
    const positions = geometry.gold.getAttribute('position')
    for (let i = 0; i < positions.count; i++) {
      const mirrored = new Vector3(-positions.getX(i), positions.getY(i), positions.getZ(i))
      expect(keys.has(positionKey(mirrored))).toBe(true)
    }
  })
  test('collision matches the relief’s visible surface at the boss, halo, field and frame', () => {
    const {baseline, radius, sunY} = lobbyTympanum
    for (const [x, y] of [[0, sunY], [2.24, sunY], [1, baseline + 0.6], [0, baseline + radius + 0.03], [radius + 0.12, baseline + 0.02]]) {
      const ray = new Raycaster(new Vector3(x, y, 1), new Vector3(0, 0, -1))
      const visual = ray.intersectObjects(meshes)[0]
      const physicalHit = ray.intersectObject(collider)[0]
      expect(visual).toBeDefined()
      expect(physicalHit).toBeDefined()
      expect(physicalHit.distance).toBeCloseTo(visual.distance, 5)
    }
    expect(collision[1].length).toBe(parts.reduce((sum, part) => sum + part.index!.count, 0))
  })
  test('owns and disposes all three geometries, without consuming them when creating collision', () => {
    const owned = new LobbyTympanumGeometry
    const disposed = [0, 0, 0]
    const resources = [owned.field, owned.stone, owned.gold]
    for (const [i, part] of resources.entries()) {
      part.addEventListener('dispose', () => disposed[i]++)
    }
    owned.collision()
    expect(disposed).toEqual([0, 0, 0])
    owned.dispose()
    expect(disposed).toEqual([1, 1, 1])
  })
  test('mounts once inside the Lobby vault and borrows its stone and the shared polished gold', async () => {
    const vault = await Bun.file('src/components/levels/gallery/LobbyVault/index.tsx').text()
    const component = await Bun.file('src/components/levels/gallery/LobbyTympanum/index.tsx').text()
    expect(vault.match(/<LobbyTympanum /gu)).toHaveLength(1)
    expect(vault).toContain('<LobbyTympanum gilt={gold} stone={stone} />')
    expect(component).toContain('rotation={[0, Math.PI, 0]}')
    expect(component).toContain('position={[0, 0, lobbyTympanum.wallZ]}')
    expect(component).toContain('MeshSurfaceCollider args={collision}')
    expect(component).not.toMatch(/(?:gilt|stone)\.dispose|useDisposable\((?:gilt|stone)\)/u)
  })
  test('uses non-emissive procedural ceramic with a cheap, plain fast-mode surface', () => {
    for (const heavy of [false, true]) {
      const mosaic = new CelestialMosaicMaterial(heavy)
      try {
        expect(mosaic.map).toBeNull()
        expect(mosaic.emissive.getHex()).toBe(0)
        expect(mosaic.colorNode !== null).toBe(heavy)
        expect(mosaic.normalNode !== null).toBe(heavy)
        expect(mosaic.roughness).toBeGreaterThan(0.4)
        expect(mosaic.clearcoat).toBeGreaterThan(0)
      } finally {
        mosaic.dispose()
      }
    }
  })
})

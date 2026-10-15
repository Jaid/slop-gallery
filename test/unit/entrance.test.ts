import {expect, test} from 'bun:test'

import {FrontSide, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {walls} from '../../src/lib/gallery.ts'
import mainEntrance from '../../src/lib/gallery/entrance.ts'
import EntranceGeometry from '../../src/lib/gallery/EntranceGeometry.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import WalnutMaterial from '../../src/lib/materials/WalnutMaterial.ts'

const withEntrance = (check: (geometry: EntranceGeometry) => void) => {
  const geometry = new EntranceGeometry
  try {
    check(geometry)
  } finally {
    geometry.dispose()
  }
}
test('the entrance stays within a lean triangle budget', () => {
  withEntrance(geometry => {
    // The previous door with strap hinges, ring pulls and 96-segment arches used about 6000 triangles.
    expect(triangleCount(geometry.leaves) + triangleCount(geometry.frame) + triangleCount(geometry.metal)).toBeLessThan(2500)
  })
})
test('every walnut piece carries finite grain coordinates', () => {
  withEntrance(geometry => {
    const grain = geometry.leaves.getAttribute('woodGrain')
    expect(grain.itemSize).toBe(3)
    expect(grain.count).toBe(geometry.leaves.getAttribute('position').count)
    expect([...grain.array].every(Number.isFinite)).toBe(true)
    // Rails, stiles, the bent head rail and the panels each get their own seed.
    const seeds = new Set<number>
    for (let index = 0; index < grain.count; index++) {
      seeds.add(grain.getZ(index))
    }
    expect(seeds.size).toBeGreaterThan(20)
  })
  const material = new WalnutMaterial
  material.dispose()
})
test('the leaves are closed: no view through the joinery reaches the wall', () => {
  withEntrance(geometry => {
    const leaves = new Mesh(geometry.leaves, new MeshBasicMaterial({side: FrontSide}))
    const ray = new Raycaster
    const camera = new Vector3(0.35, 0.75, 0.8)
    // The bottom corners of the inner lower panel, seen at a steep angle.
    for (let x = 0.12; x <= 0.22; x += 0.001) {
      for (let y = 0.3; y < 0.6; y += 0.005) {
        const target = new Vector3(x, y, 0.2)
        ray.set(camera, target.sub(camera).normalize())
        const [hit] = ray.intersectObject(leaves)
        expect(hit.point.z).toBeGreaterThan(0.2)
      }
    }
  })
})
test('the panels stay in front of the baseboard and the keystone tucks under the cornice', () => {
  const north = walls.find(wall => wall.id === 'lobby-north')!
  // architecture.ts: the upper cornice band is 0.23 m tall, centered 0.22 m below the wall top.
  expect(mainEntrance.keystoneTop).toBeLessThanOrEqual(north.height - 0.22 - 0.115)
  expect(mainEntrance.keystoneTop).toBeGreaterThan(north.height - 0.22 - 0.115 - 0.01)
  withEntrance(geometry => {
    const position = geometry.leaves.getAttribute('position')
    let shallowest = Infinity
    for (let index = 0; index < position.count; index++) {
      // Baseboard cap: 0.38–0.44 m high, 0.25 m in front of the wall line.
      if (position.getY(index) < 0.45) {
        shallowest = Math.min(shallowest, position.getZ(index) > 0.2 ? position.getZ(index) : Infinity)
      }
    }
    expect(shallowest).toBeGreaterThan(0.255)
    // The keystone is the only stone near the crown that projects past the 0.36 m architrave.
    const frame = geometry.frame.getAttribute('position')
    let keystoneTop = -Infinity
    for (let index = 0; index < frame.count; index++) {
      if (frame.getZ(index) > 0.37) {
        keystoneTop = Math.max(keystoneTop, frame.getY(index))
      }
    }
    expect(keystoneTop).toBeCloseTo(mainEntrance.keystoneTop, 4)
  })
})

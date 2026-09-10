import {expect, test} from 'bun:test'

import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {lowerGallery} from '../../src/lib/gallery/lowerGallery.ts'
import {moonfallWallFixtures} from '../../src/lib/gallery/moonfall/fixtures.ts'
import {walls} from '../../src/lib/gallery/walls.ts'

test('every Moonfall LED is backed by solid wall across its entire housing', () => {
  const room = lowerGallery.moonfall
  const material = new MeshBasicMaterial
  try {
    for (const {side, lightX, lightZs} of moonfallWallFixtures) {
      const wall = walls.find(candidate => candidate.id === (side < 0 ? 'moonfall-west' : 'moonfall-east'))!
      const geometry = createArchitectureGeometry(wall)
      const mesh = new Mesh(geometry.surface, material)
      mesh.position.set(...wall.center)
      mesh.rotation.y = wall.rotation
      mesh.updateMatrixWorld(true)
      try {
        expect(lightZs).toHaveLength(5)
        for (const z of lightZs) {
          for (const offset of [-0.124, 0, 0.124]) {
            for (const y of [0.801, 2.2, 3.599]) {
              const origin = new Vector3(room.center[0] + lightX - side * 0.075, lowerGallery.floorY + y, room.center[1] + z + offset)
              const hit = new Raycaster(origin, new Vector3(side, 0, 0), 0, 0.3).intersectObject(mesh)[0]
              expect(hit).toBeDefined()
              expect(hit.distance).toBeCloseTo(0.145, 5)
            }
          }
        }
      } finally {
        geometry.dispose()
      }
    }
  } finally {
    material.dispose()
  }
})
test('Sienna and Moonfall have no bench meshes or their automatic colliders', async () => {
  for (const room of ['SiennaRoom', 'MoonfallRoom']) {
    const source = await Bun.file(`src/components/levels/gallery/${room}/index.tsx`).text()
    expect(source).not.toContain('BenchSeat')
    expect(source).not.toContain('colliders="cuboid"')
    expect(source).toContain('CuboidCollider')
  }
  expect(await Bun.file("src/components/levels/gallery/LodgeRoom/index.tsx").text()).toContain('BenchSeat')
})

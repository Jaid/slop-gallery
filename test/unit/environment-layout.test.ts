import {expect, test} from 'bun:test'

import {Box3, Euler, Matrix4, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {corridorPassage, corridorStairs} from '../../src/lib/gallery/corridor.ts'
import {fountainBench, fountainBenches} from '../../src/lib/gallery/fountain/benches.ts'
import {fountain} from '../../src/lib/gallery/fountain/config.ts'
import {SlattedBenchGeometry} from '../../src/lib/gallery/fountain/SlattedBenchGeometry.ts'
import {lodge, lodgeWindowRibCutouts} from '../../src/lib/gallery/lodge.ts'
import {TimberGeometry} from '../../src/lib/gallery/passages/TimberGeometry.ts'
import {playerSpawn} from '../../src/lib/gallery/PlayerSession.ts'
import {walls} from '../../src/lib/gallery/walls.ts'

test('four matching slatted benches surround the relocated fountain and leave the spawn clear', () => {
  expect(fountain.position).toEqual([0, 0, -6])
  expect(fountainBenches).toHaveLength(4)
  const geometry = new SlattedBenchGeometry
  try {
    const seat = geometry.wood.boundingBox!
    expect(seat.max.y).toBeCloseTo(0.5)
    expect(seat.max.x - seat.min.x).toBeGreaterThan(2.7)
    expect(seat.max.z - seat.min.z).toBeCloseTo(0.8)
    expect(geometry.metal.boundingBox!.min.y).toBeCloseTo(0)
    for (const part of [geometry.wood, geometry.metal]) {
      for (const attribute of Object.values(part.attributes)) {
        expect([...attribute.array].every(Number.isFinite)).toBe(true)
      }
    }
    for (const {position, rotation} of fountainBenches) {
      expect(Math.hypot(position[0] - fountain.position[0], position[2] - fountain.position[2])).toBeCloseTo(fountainBench.radius)
      const transform = (new Matrix4).makeRotationFromEuler(new Euler(...rotation)).setPosition(...position)
      const bounds = (new Box3).copy(seat).applyMatrix4(transform)
      expect(bounds.distanceToPoint(new Vector3(...playerSpawn.position))).toBeGreaterThan(0.5)
      const center = new Vector3(fountain.position[0], 0.48, fountain.position[2])
      expect(bounds.distanceToPoint(center) - fountain.radius).toBeGreaterThan(1.4)
    }
    // Six continuous lengthwise battens, with genuine openings between them.
    expect(fountainBench.slats).toBe(6)
    const material = new MeshBasicMaterial
    try {
      const mesh = new Mesh(geometry.wood, material)
      const {depth, slats, slatGap} = fountainBench
      const pitch = (depth + slatGap) / slats
      for (let slat = 0; slat < slats; slat++) {
        const z = (slat + 0.5) * pitch - (depth + slatGap) / 2
        for (const x of [-1.3, -0.8, 0, 0.8, 1.3]) {
          const ray = new Raycaster(new Vector3(x, 1, z), new Vector3(0, -1, 0))
          expect(ray.intersectObject(mesh)[0].point.y).toBeCloseTo(fountainBench.height)
          if (slat < slats - 1) {
            ray.ray.origin.z += pitch / 2
            expect(ray.intersectObject(mesh)).toHaveLength(0)
          }
        }
        const left = new Raycaster(new Vector3(-1, 1, z), new Vector3(0, -1, 0)).intersectObject(mesh)[0]
        const right = new Raycaster(new Vector3(1, 1, z), new Vector3(0, -1, 0)).intersectObject(mesh)[0]
        expect(left.uv!.x).toBeCloseTo(right.uv!.x)
        expect(Math.abs(left.uv!.y - right.uv!.y)).toBeGreaterThan(0.6)
      }
    } finally {
      material.dispose()
    }
  } finally {
    geometry.dispose()
  }
})
test('timber entrances have a single exposed face across the ribs, lining and structural wall ends', () => {
  const material = new MeshBasicMaterial
  const entrances = [
    {
      timber: TimberGeometry.stairs(corridorStairs),
      start: corridorStairs.start,
      width: corridorStairs.width,
      wallIds: ['sienna-west', 'corridor-stairs-return-north', 'corridor-stairs-return-south'],
    },
    {
      timber: TimberGeometry.passage(corridorPassage, lodgeWindowRibCutouts),
      start: [corridorPassage.path[0][0], corridorPassage.floorY, corridorPassage.path[0][1]],
      width: corridorPassage.width,
      wallIds: ['lodge-west', ...corridorPassage.walls.map(wall => wall.id)],
    },
  ]
  try {
    for (const {timber, start, width, wallIds} of entrances) {
      const architecture = walls.filter(wall => wallIds.includes(wall.id)).map(wall => ({
        wall,
        geometry: createArchitectureGeometry(wall),
      }))
      try {
        const meshes = [timber.ribs, timber.shell].map(part => new Mesh(part, material))
        for (const {wall, geometry} of architecture) {
          for (const part of [geometry.surface, ...geometry.trim]) {
            const mesh = new Mesh(part, material)
            mesh.position.set(...wall.center)
            mesh.rotation.y = wall.rotation
            mesh.updateMatrixWorld()
            meshes.push(mesh)
          }
        }
        for (const side of [-1, 1]) {
          for (const cross of [1.06, 1.12, 1.19, 1.2, 1.215, 1.22, 1.24, 1.28, 1.31]) {
            for (const height of [0.1, 0.41, 0.83, 1.37, 1.9, 2.2, 2.9, 3.35]) {
              const origin = new Vector3(start[0] + 0.8, start[1] + height, start[2] + side * (width / 2 - 1.3 + cross))
              const hits = new Raycaster(origin, new Vector3(-1, 0, 0), 0, 2).intersectObjects(meshes)
              expect(hits.length).toBeGreaterThan(0)
              const front = hits.filter(hit => Math.abs(hit.distance - hits[0].distance) < 0.0001)
              expect(new Set(front.map(hit => hit.object)).size).toBe(1)
            }
          }
        }
        // The timber is a real projecting reveal, not a depth-biased material or an open ceiling seam.
        const origin = new Vector3(start[0] + 0.015, start[1] + 1.6, start[2])
        const ceiling = new Raycaster(origin, new Vector3(0, 1, 0), 0, 3).intersectObjects(meshes)[0]
        expect(ceiling.distance).toBeGreaterThan(1.5)
        expect(ceiling.distance).toBeLessThan(2.1)
      } finally {
        for (const {geometry} of architecture) {
          geometry.dispose()
        }
      }
    }
  } finally {
    material.dispose()
    for (const {timber} of entrances) {
      timber.dispose()
    }
  }
})
test('the reported timber rib no longer shares its visible face with a wall baseboard', () => {
  const wall = walls.find(value => value.id === 'corridor-wall-4')!
  const architecture = createArchitectureGeometry(wall)
  const timber = TimberGeometry.passage(corridorPassage, lodgeWindowRibCutouts)
  const material = new MeshBasicMaterial
  try {
    expect(wall.trimStyle).toBe('none')
    expect(architecture.trim).toHaveLength(0)
    const surface = new Mesh(architecture.surface, material)
    surface.position.set(...wall.center)
    surface.rotation.y = wall.rotation
    surface.updateMatrixWorld()
    const meshes = [surface, new Mesh(timber.ribs, material), new Mesh(timber.shell, material)]
    const ray = new Raycaster(new Vector3(lodge.approachX, lodge.floorY + 0.3, -20), new Vector3(-1, 0, 0))
    const hits = ray.intersectObjects(meshes)
    expect(hits[0].point.x).toBeLessThan(lodge.approachX - corridorPassage.width / 2 + 0.3)
    expect(hits[1].distance - hits[0].distance).toBeGreaterThan(0.01)
    expect(walls.filter(value => value.room === 'corridor').every(value => value.trimStyle === 'none')).toBe(true)
    expect(walls.filter(value => value.id.startsWith('lodge-tunnel-')).every(value => value.trimStyle === 'plain')).toBe(true)
  } finally {
    material.dispose()
    architecture.dispose()
    timber.dispose()
  }
})
test('environmental room names and taglines are removed without removing artwork captions', async () => {
  for (const name of ['MoonfallRoom', 'GalleryStairs', 'LodgeRoom', 'LodgeCorridorRoute', 'Fountain', 'MainEntrance']) {
    expect(await Bun.file(`src/components/Scene/${name}.tsx`).text()).not.toContain('CanvasText')
  }
  expect(await Bun.file('src/components/PortraitLabel/index.tsx').text()).toContain('CanvasText')
})

import type {Wall} from '../../src/lib/gallery/walls.ts'
import type {BufferGeometry} from 'three/webgpu'

import {afterAll, describe, expect, test} from 'bun:test'

import {DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {soundboardWalls} from '../../src/lib/audio/soundboard.ts'
import {createArchitectureGeometry, wallFace} from '../../src/lib/gallery/architecture.ts'
import miterCorners from '../../src/lib/gallery/cornerMiters.ts'
import {corridorPassage} from '../../src/lib/gallery/corridor.ts'
import {knotGalleryWalls} from '../../src/lib/gallery/knotGallery.ts'
import lodge, {lodgeTunnel} from '../../src/lib/gallery/lodge.ts'
import lodgeInterior from '../../src/lib/gallery/lodgeInterior/layout.ts'
import UpholsteredSeatGeometry from '../../src/lib/gallery/lodgeInterior/UpholsteredSeatGeometry.ts'
import Passage from '../../src/lib/gallery/passages/Passage.ts'
import TimberGeometry from '../../src/lib/gallery/passages/TimberGeometry.ts'
import VaultGeometry from '../../src/lib/gallery/passages/VaultGeometry.ts'
import walls from '../../src/lib/gallery/walls.ts'

const material = new MeshBasicMaterial({side: DoubleSide})
const disposables: Array<{dispose: () => void}> = [material]
afterAll(() => {
  for (const item of disposables) {
    item.dispose()
  }
})
const wallById = (id: string) => walls.find(wall => wall.id === id)!
/** The wall’s architecture as world-space meshes, tagged by part. */
function wallMeshes(wall: Wall) {
  const geometry = createArchitectureGeometry(wall)
  disposables.push(geometry)
  const place = (part: BufferGeometry, name: string) => {
    const mesh = new Mesh(part, material)
    mesh.name = `${wall.id}/${name}`
    mesh.position.set(...wall.center)
    mesh.rotation.y = wall.rotation
    mesh.updateMatrixWorld()
    return mesh
  }
  return [place(geometry.surface, 'surface'), ...geometry.trim.map(part => place(part, 'trim')), ...geometry.cornice.map((part, i) => place(part, `cornice-${i}`))]
}
/** The nearest hits along a ray, keeping every surface that lies at the same distance as the first. */
function nearestHits(meshes: Array<Mesh>, origin: Vector3, direction: Vector3) {
  const raycaster = new Raycaster(origin, direction.normalize())
  const hits = raycaster.intersectObjects(meshes, false)
  expect(hits.length).toBeGreaterThan(0)
  return hits.filter(hit => hit.distance - hits[0].distance < 1e-4)
}
const mitered = (list: ReadonlyArray<Wall>, id: string) => list.find(wall => wall.id === id)?.miters
/** the passage’s walls as bare surfaces */
const passageSurfaces = (passage: Passage) => passage.walls.flatMap(wall => wallMeshes({
  ...wall,
  trimStyle: 'none',
}))
const horizontal = (x: number, z: number) => {
  const direction = new Vector3(x, 0, z)
  return direction.normalize()
}
describe('inside corners of room walls', () => {
  test('every room corner miters both walls, on all three levels', () => {
    for (const id of ['lodge-north', 'lodge-east', 'lodge-south', 'lodge-west', 'vesper-north', 'salon-west']) {
      expect(mitered(walls, id)).toEqual([true, true])
    }
    // Walls that run on in a straight line, or open into a doorway, keep square ends.
    expect(mitered(walls, 'lobby-west')).toEqual([true, false])
    expect(mitered(walls, 'lobby-extension-west')).toEqual([false, true])
    for (const wall of [...knotGalleryWalls, ...soundboardWalls]) {
      expect(wall.miters).toEqual([true, true])
    }
  })
  test('outside corners and mismatched trim keep square ends', () => {
    const base = {
      room: 'lobby',
      height: 5.5,
      width: 4,
    } as const
    // Two walls meeting at the origin with their faces turned outward, around the corner of a pillar.
    const outside = miterCorners([
      {
        ...base,
        id: 'a',
        center: [2, 0, 0],
        rotation: Math.PI,
      },
      {
        ...base,
        id: 'b',
        center: [0, 0, 2],
        rotation: -Math.PI / 2,
      },
    ])
    expect(outside.map(wall => wall.miters)).toEqual([undefined, undefined])
    const inside = miterCorners([
      {
        ...base,
        id: 'a',
        center: [2, 0, 0],
        rotation: 0,
      },
      {
        ...base,
        id: 'b',
        center: [0, 0, 2],
        rotation: Math.PI / 2,
      },
    ])
    expect(inside.map(wall => wall.miters)).toEqual([[true, false], [false, true]])
    const plain = miterCorners([inside[0], {
      ...inside[1],
      trimStyle: 'plain',
    }])
    expect(plain.map(wall => wall.miters)).toEqual([undefined, undefined])
  })
  // Where both walls ran their baseboards and cornices into the corner, the bands overlapped in a square with shared tops, bottoms and fronts.
  for (const [first, second] of [['lodge-south', 'lodge-east'], ['lodge-south', 'lodge-west'], ['vesper-north', 'vesper-west']] as const) {
    test(`${first} and ${second} meet with single, mitered trim surfaces`, () => {
      const a = wallById(first)
      const b = wallById(second)
      const meshes = [...wallMeshes(a), ...wallMeshes(b)]
      // The corner of both plaster faces, and the directions into the room along each face.
      const normal = (wall: Wall) => horizontal(Math.sin(wall.rotation), Math.cos(wall.rotation))
      const corner = new Vector3(a.center[0], 0, a.center[2])
      corner.addScaledVector(normal(a), wallFace)
      const toB = normal(b)
      corner.x = (Math.abs(toB.x) > 0.5 ? b.center[0] : corner.x) + toB.x * wallFace
      corner.z = (Math.abs(toB.z) > 0.5 ? b.center[2] : corner.z) + toB.z * wallFace
      const floorY = a.center[1]
      const top = a.height
      // Off the miter line, a point in front of both faces lies on only one wall’s band.
      for (const [alongA, alongB] of [[0.05, 0.12], [0.12, 0.05]]) {
        const point = corner.clone().addScaledVector(normal(a), alongA).addScaledVector(toB, alongB)
        // the baseboard’s cap from above, the cornice’s lower band from below and its upper band from above
        const probes = [
          [floorY + 1, -1, floorY + 0.44],
          [floorY + top - 1, 1, floorY + top - 0.47],
          [floorY + top + 0.25, -1, floorY + top - 0.105],
        ] as const
        for (const [y, direction, expected] of probes) {
          const hits = nearestHits(meshes, new Vector3(point.x, y, point.z), new Vector3(0, direction, 0))
          expect(hits.map(hit => hit.object.name)).toHaveLength(1)
          expect(hits[0].point.y).toBeCloseTo(expected, 4)
        }
      }
    })
  }
  test('the Lodge’s widened doorway keeps its reveal clear of the north wall’s baseboard', () => {
    const north = wallById('lodge-north')
    const east = wallById('lodge-east')
    const hole = east.holes![0]
    // The east wall runs north to south from its −x end; its doorway’s north jamb is the hole’s −u edge.
    const jambZ = east.center[2] + hole.u - hole.width / 2
    const northFace = north.center[2] + wallFace
    for (const front of [0.2, 0.25]) {
      expect(Math.abs(jambZ - (north.center[2] + front))).toBeGreaterThanOrEqual(0.02 - 1e-9)
    }
    expect(jambZ).toBeGreaterThan(north.center[2] + 0.25)
    // The casing still reaches behind the log face, leaving no gap against the north wall.
    expect(jambZ - 0.17).toBeLessThan(northFace)
    const meshes = [...wallMeshes(north), ...wallMeshes(east)]
    // below the arch’s springing line, where the jamb is plumb
    for (const y of [0.2, 0.41, 1.1]) {
      // Across the jamb, from inside the doorway toward the north wall.
      const hits = nearestHits(meshes, new Vector3(east.center[0] - 0.05, lodge.floorY + y, jambZ + 0.5), new Vector3(0, 0, -1))
      expect(hits).toHaveLength(1)
      expect(hits[0].object.name).toBe('lodge-east/surface')
      expect(hits[0].point.z).toBeCloseTo(jambZ, 4)
    }
  })
})
describe('passage elbows', () => {
  for (const passage of [corridorPassage, lodgeTunnel]) {
    test(`${passage.id}: walls close the inner corner of every elbow`, () => {
      const meshes = passageSurfaces(passage)
      const half = passage.width / 2
      for (let i = 1; i < passage.path.length - 1; i++) {
        const [px, pz] = passage.path[i - 1]
        const [x, z] = passage.path[i]
        const [nx, nz] = passage.path[i + 1]
        // The inner corner lies against the incoming travel and toward the outgoing one.
        const inner = [x - Math.sign(x - px) * half + Math.sign(nx - x) * half, z - Math.sign(z - pz) * half + Math.sign(nz - z) * half] as const
        const faceCorner = new Vector3(inner[0] + Math.sign(x - inner[0]) * wallFace, passage.floorY + 1.6, inner[1] + Math.sign(z - inner[1]) * wallFace)
        const origin = new Vector3(x, passage.floorY + 1.6, z)
        // Aimed just past the corner of the faces, into what was an open square between both walls’ ends.
        const toCorner = faceCorner.clone().sub(origin).normalize()
        const target = faceCorner.clone().addScaledVector(toCorner, 0.03)
        const hits = nearestHits(meshes, origin, target.clone().sub(origin))
        expect(hits[0].distance).toBeLessThan(origin.distanceTo(faceCorner) + 1e-3)
      }
    })
  }
  test('timber passages roof only their elbows with slabs, below which the linings stop', () => {
    expect(corridorPassage.junctions).toHaveLength(2)
    for (const [i, {center, size}] of corridorPassage.junctions.entries()) {
      const [x, z] = corridorPassage.path[i + 1]
      expect(center[0]).toBeCloseTo(x)
      expect(center[1]).toBeCloseTo(z)
      expect(size).toEqual([corridorPassage.width, corridorPassage.width])
    }
    const geometry = TimberGeometry.passage(corridorPassage)
    disposables.push(geometry)
    // Along a span, the lining’s crown is the ceiling, in the plane a slab’s underside would occupy.
    const mesh = new Mesh(geometry.shell, material)
    const [x, z] = [lodge.approachX, (lodge.returnZ + lodge.siennaZ) / 2]
    const upward = new Raycaster(new Vector3(x, corridorPassage.floorY + 1, z), new Vector3(0, 1, 0))
    const hit = upward.intersectObject(mesh)[0]
    expect(hit.point.y).toBeCloseTo(corridorPassage.floorY + corridorPassage.height, 5)
    // Straight passages have no elbows.
    const straight = new Passage('straight', 'lodge', [[0, 0], [0, 6]], 0)
    expect(straight.junctions).toEqual([])
  })
  test('vault ribs never overlap, even on a short run before an elbow', () => {
    const vault = new VaultGeometry(lodgeTunnel)
    disposables.push(vault)
    const mesh = new Mesh(vault.ribs, material)
    const radius = lodgeTunnel.width / 2
    const spring = lodgeTunnel.floorY + lodgeTunnel.height - radius
    for (const [i, {start, end}] of lodgeTunnel.spans.entries()) {
      const direction = horizontal(end[0] - start[0], end[1] - start[1])
      // Through the ribs’ crowns, along the span.
      const origin = new Vector3(start[0], spring + radius - 0.04, start[1])
      origin.addScaledVector(direction, i ? radius : -0.5)
      const raycaster = new Raycaster(origin, direction)
      const hits = raycaster.intersectObject(mesh)
      expect(hits.length).toBeGreaterThan(0)
      // Entering and leaving alternate; overlapping ribs would enter twice in a row.
      for (const [index, hit] of hits.entries()) {
        expect(Math.sign(hit.face!.normal.dot(direction))).toBe(index % 2 ? 1 : -1)
      }
    }
  })
  test('vaults close their spandrels toward an elbow, up to its ceiling', () => {
    const vault = new VaultGeometry(lodgeTunnel)
    disposables.push(vault)
    const mesh = new Mesh(vault.shell, material)
    const radius = lodgeTunnel.width / 2
    const [x, z] = lodgeTunnel.path[1]
    const elbow = new Vector3(x, 0, z)
    for (const [i, {start, end}] of lodgeTunnel.spans.entries()) {
      // From the elbow, back along the span it ends or ahead along the span it starts.
      const direction = i ? horizontal(end[0] - start[0], end[1] - start[1]) : horizontal(start[0] - end[0], start[1] - end[1])
      const across = new Vector3(-direction.z, 0, direction.x)
      for (const side of [-1, 1]) {
        // Beside the vault’s arch, just under the elbow’s ceiling, where the turn used to look into the void behind the vault.
        for (const height of [lodgeTunnel.height - 0.05, lodgeTunnel.height - 0.6]) {
          const origin = elbow.clone().addScaledVector(across, side * (radius - wallFace - 0.15))
          origin.y = lodgeTunnel.floorY + height
          const raycaster = new Raycaster(origin, direction, 0, radius + 0.5)
          const hits = raycaster.intersectObject(mesh)
          expect(hits.length).toBeGreaterThan(0)
          expect(hits[0].distance).toBeLessThan(radius)
          expect(hits[0].distance).toBeGreaterThan(radius - wallFace - 0.05)
        }
      }
    }
  })
})
describe('Lodge furniture', () => {
  test('the window seat’s cushion stays inside its timber ends', () => {
    const {windowSeat} = lodgeInterior
    const endInner = windowSeat.length / 2 - 0.01 - windowSeat.endWidth
    expect(windowSeat.cushion[0] / 2).toBeGreaterThan(endInner)
    expect(windowSeat.cushion[0] / 2).toBeLessThan(endInner + windowSeat.endWidth - 0.02)
    expect(windowSeat.depth - windowSeat.cushion[2]).toBeGreaterThanOrEqual(0.02)
  })
  for (const seats of [1, 3]) {
    test(`a ${seats}-seat frame keeps its rear and ends off the arms’ faces`, () => {
      const geometry = new UpholsteredSeatGeometry(seats)
      disposables.push(geometry)
      const mesh = new Mesh(geometry.leather, material)
      const {depth, armWidth} = UpholsteredSeatGeometry
      // From behind, across the arm and the back frame: one surface each, never two in the same plane.
      for (const [x, y] of [[geometry.width / 2 - armWidth / 2, 0.4], [0, 0.27], [0, 0.6], [geometry.width / 2 - 0.05, 0.27]]) {
        const hits = nearestHits([mesh], new Vector3(x, y, -2), new Vector3(0, 0, 1))
        expect(hits).toHaveLength(1)
      }
      // From the side, across the arm.
      for (const y of [0.3, 0.5]) {
        expect(nearestHits([mesh], new Vector3(3, y, -depth / 2 + 0.1), new Vector3(-1, 0, 0))).toHaveLength(1)
      }
    })
  }
})

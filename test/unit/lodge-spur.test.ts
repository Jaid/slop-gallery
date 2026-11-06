import {afterAll, expect, test} from 'bun:test'

import {DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {vaultShellThickness, wallFace} from '../../src/lib/gallery/architectureDimensions.ts'
import {bastionLink, insideBastion, lodgeSpur, lodgeSpurEnd, lodgeSpurLanterns, lodgeSpurWidth, lodgeSpurX} from '../../src/lib/gallery/bastionNetwork.ts'
import lodge, {lodgeEastWindow, lodgeWindow} from '../../src/lib/gallery/lodge.ts'
import LodgeEastWindowGeometry from '../../src/lib/gallery/LodgeEastWindowGeometry.ts'
import RouteVaultGeometry from '../../src/lib/gallery/passages/RouteVaultGeometry.ts'
import {routePendantMounts} from '../../src/lib/gallery/pendants/mounts.ts'
import {openings} from '../../src/worlds/gallery/relations.ts'
import walls from './fixtures/gallery.ts'

const linkWall = walls.find(wall => wall.id === 'bastion-link_wall_5')!
const lodgeWall = walls.find(wall => wall.id === 'lodge-east')!
const window = new LodgeEastWindowGeometry
afterAll(() => window.dispose())
/** Raycast a particular architectural wall, with the same placement as WallSurface. */
const wallHit = (wall: typeof linkWall, from: [number, number, number], direction: [number, number, number]) => {
  const architecture = createArchitectureGeometry(wall)
  const material = new MeshBasicMaterial({side: DoubleSide})
  const mesh = new Mesh(architecture.surface, material)
  mesh.position.set(...wall.center)
  mesh.rotation.y = wall.rotation
  mesh.updateMatrixWorld(true)
  const ray = new Raycaster(new Vector3(...from), new Vector3(...direction), 0, 8)
  const hit = ray.intersectObject(mesh).at(0)
  architecture.dispose()
  material.dispose()
  return hit?.distance
}
test('the link wall at the marked point has a walkable bare arch leading into the side passage', () => {
  const hole = linkWall.holes!.find(value => value.name === 'lodge_spur')!
  expect(hole).toBeDefined()
  expect(hole.casing).toBe(false)
  expect(hole.width).toBeCloseTo(lodgeSpurWidth - 0.21, 8)
  const start = lodgeSpur.route.at(0)
  expect(start.point[0]).toBeCloseTo(lodgeSpurX, 9)
  expect(start.point[1]).toBeCloseTo(linkWall.center[2], 9)
  expect(start.y).toBeCloseTo(bastionLink.floorAt(lodgeSpurX, start.point[1])!, 7)
  expect(wallHit(linkWall, [lodgeSpurX, start.y + 1.2, -28], [0, 0, -1])).toBeUndefined()
  expect(wallHit(linkWall, [lodgeSpurX - 3, start.y + 1.2, -28], [0, 0, -1])).toBeDefined()
})
test('the vaulted passage stays straight past the window and closes just short of the existing northern passage', () => {
  const end = lodgeSpur.route.end
  expect(end.point[0]).toBeCloseTo(lodgeSpurX, 9)
  expect(end.point[1]).toBeLessThan(lodgeEastWindow.z - lodgeEastWindow.width / 2)
  expect(end.point[1] - wallFace).toBeCloseTo(lodge.tunnelZ + lodge.passageWidth / 2 + vaultShellThickness + 0.01, 9)
  expect(end.heading).toBeCloseTo(-Math.PI / 2, 9)
  expect(end.y).toBe(-5)
  expect(lodgeSpur.floorAt(end.point[0], end.point[1] + 0.1)).toBeDefined()
  expect(lodgeSpur.floorAt(end.point[0], end.point[1] - 0.2)).toBeUndefined()
  expect(walls.some(wall => wall.id === lodgeSpurEnd.id)).toBe(true)
  expect(wallHit(lodgeSpurEnd, [lodgeSpurX, end.y + 1.6, end.point[1] + 0.5], [0, 0, -1])).toBeDefined()
  expect(wallHit(lodgeSpurEnd, [lodgeSpurX, end.y + end.height - 0.01, end.point[1] + 0.5], [0, 0, -1])).toBeDefined()
  for (let along = 0.1; along < lodgeSpur.route.length - 0.1; along += 0.1) {
    const {point: [x, z], y} = lodgeSpur.route.at(along)
    expect(x).toBeCloseTo(lodgeSpurX, 9)
    expect(insideBastion([x, y + 1, z])).toBe(true)
    expect(lodgeSpur.floorAt(x, z)).toBeCloseTo(y, 7)
  }
  // The branch has its own vault, paving, ribs and a supported pendant lantern.
  const vault = new RouteVaultGeometry(lodgeSpur)
  try {
    expect(vault.paving.getAttribute('position').count).toBeGreaterThan(0)
    expect(vault.shell.getAttribute('position').count).toBeGreaterThan(0)
    expect(routePendantMounts(lodgeSpur, [vault.shell, vault.ribs], lodgeSpurLanterns)).toHaveLength(1)
  } finally {
    vault.dispose()
  }
})
test('the east Lodge wall opens to one matching glazed window, not another doorway', () => {
  const hole = lodgeWall.holes!.find(value => value.name === 'east_window')!
  expect(hole).toBeDefined()
  expect(hole.profile).toBe('rectangle')
  expect(hole.bottom).toBeCloseTo(lodgeEastWindow.bottom - -5, 8)
  expect(hole.width).toBe(lodgeWindow.width)
  expect(lodgeEastWindow.top).toBe(lodgeWindow.top)
  expect(wallHit(lodgeWall, [-18.9, -3, lodgeEastWindow.z], [-1, 0, 0])).toBeUndefined()
  expect(wallHit(lodgeWall, [-18.9, -3, lodgeEastWindow.z + 2], [-1, 0, 0])).toBeDefined()
  window.glass.computeBoundingBox()
  const pane = window.glass.boundingBox!
  expect(pane.min.x).toBeGreaterThan(lodgeEastWindow.x)
  expect(pane.max.x).toBeCloseTo(lodgeSpurX - lodgeSpurWidth / 2 + wallFace, 5)
  expect(pane.min.y).toBeCloseTo(lodgeEastWindow.bottom, 6)
  expect(pane.max.y).toBeCloseTo(lodgeEastWindow.top, 6)
  expect(pane.min.z).toBeCloseTo(lodgeEastWindow.z - lodgeEastWindow.width / 2, 5)
  const glassMesh = new Mesh(window.glass, new MeshBasicMaterial({side: DoubleSide}))
  try {
    const ray = new Raycaster(new Vector3(lodgeSpurX, -3, lodgeEastWindow.z), new Vector3(-1, 0, 0))
    expect(ray.intersectObject(glassMesh)[0]?.point.x).toBeCloseTo(lodgeSpurX - lodgeSpurWidth / 2 + wallFace, 5)
  } finally {
    glassMesh.material.dispose()
  }
  expect(openings).toContainEqual({
    rooms: ['bastion', 'lodge'],
    holes: [['lodge-east', 'east_window']],
  })
})
test('the entrance clears the parent vault and ribs at walking height, and the side window clears the spur', () => {
  const material = new MeshBasicMaterial({side: DoubleSide})
  const link = new RouteVaultGeometry(bastionLink)
  const spur = new RouteVaultGeometry(lodgeSpur)
  try {
    const start = lodgeSpur.route.at(0)
    for (const dx of [-0.6, 0, 0.6]) {
      const ray = new Raycaster(new Vector3(lodgeSpurX + dx, start.y + 1.7, -28), new Vector3(0, 0, -1), 0, 2.2)
      for (const geometry of [link.shell, link.ribs]) {
        expect(ray.intersectObject(new Mesh(geometry, material))).toHaveLength(0)
      }
      // Cutting the doorway must leave a connected roof, rather than an opening to the sky.
      for (const z of [-28.4, -29, -29.7]) {
        const up = new Raycaster(new Vector3(lodgeSpurX + dx, start.y + 1.7, z), new Vector3(0, 1, 0), 0, 1.1)
        expect(up.intersectObject(new Mesh(link.shell, material)).length).toBeGreaterThan(0)
      }
    }
    const ray = new Raycaster(new Vector3(lodgeSpurX, -3, lodgeEastWindow.z), new Vector3(-1, 0, 0), 0, 3.1)
    for (const geometry of [spur.shell, spur.ribs]) {
      expect(ray.intersectObject(new Mesh(geometry, material))).toHaveLength(0)
    }
    const side = lodgeSpur.walls.find(wall => wall.holes?.some(hole => hole.name === 'lodge_window'))!
    expect(wallHit(side, [lodgeSpurX, -3, lodgeEastWindow.z], [-1, 0, 0])).toBeUndefined()
  } finally {
    material.dispose()
    link.dispose()
    spur.dispose()
  }
})

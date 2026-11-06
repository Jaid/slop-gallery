import {afterAll, expect, test} from 'bun:test'

import {DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {bastionLink, insideBastion, lodgeSpur, lodgeSpurLanterns, lodgeSpurWidth, lodgeSpurX} from '../../src/lib/gallery/bastionNetwork.ts'
import {lodgeEastWindow, lodgeWindow} from '../../src/lib/gallery/lodge.ts'
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
test('the vaulted passage turns toward the Lodge and ends at its east window, without connecting to another passage', () => {
  const end = lodgeSpur.route.end
  expect(end.point).toEqual([lodgeEastWindow.x, lodgeEastWindow.z])
  expect(end.heading).toBeCloseTo(-Math.PI, 9)
  expect(end.y).toBe(-5)
  expect(lodgeSpur.floorAt(end.point[0] + 0.1, end.point[1])).toBeDefined()
  expect(lodgeSpur.floorAt(lodgeEastWindow.x - 0.2, lodgeEastWindow.z)).toBeUndefined()
  for (let along = 0.1; along < lodgeSpur.route.length - 0.1; along += 0.1) {
    const {point: [x, z], y} = lodgeSpur.route.at(along)
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
  expect(pane.max.x).toBeLessThan(lodgeEastWindow.x + 0.25)
  expect(pane.min.y).toBeCloseTo(lodgeEastWindow.bottom, 6)
  expect(pane.max.y).toBeCloseTo(lodgeEastWindow.top, 6)
  expect(pane.min.z).toBeCloseTo(lodgeEastWindow.z - lodgeEastWindow.width / 2, 5)
  const glassMesh = new Mesh(window.glass, new MeshBasicMaterial({side: DoubleSide}))
  try {
    const ray = new Raycaster(new Vector3(-18.8, -3, lodgeEastWindow.z), new Vector3(-1, 0, 0))
    expect(ray.intersectObject(glassMesh)[0]?.point.x).toBeCloseTo(lodgeEastWindow.x + 0.14, 2)
  } finally {
    glassMesh.material.dispose()
  }
  expect(openings).toContainEqual({
    rooms: ['bastion', 'lodge'],
    holes: [['lodge-east', 'east_window']],
  })
})

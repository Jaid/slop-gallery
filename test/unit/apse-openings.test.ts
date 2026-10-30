import type {Vec3} from '../../src/lib/gallery/types.ts'
import type {Wall} from '../../src/lib/placement/wallGeometry.ts'

import {afterAll, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import EgoMotor from 'ego-player/motor'
import {DoubleSide, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import BarredOpeningGeometry from '../../src/lib/gallery/BarredOpeningGeometry.ts'
import {apseOpeningPoint, apseOpenings, fortressClearance, fortressCurve, fortressLanterns} from '../../src/lib/gallery/fortress.ts'
import {oculusPlatform} from '../../src/lib/gallery/lowerGallery.ts'
import oculusApse from '../../src/lib/gallery/oculusApse.ts'
import OculusGroundGeometry from '../../src/lib/gallery/OculusGroundGeometry.ts'
import RouteVaultGeometry from '../../src/lib/gallery/passages/RouteVaultGeometry.ts'
import {openingTop, wallPosition} from '../../src/lib/placement/wallGeometry.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'
import walls from './fixtures/gallery.ts'

await RAPIER.init()
const platformY = oculusPlatform.position[1] + oculusPlatform.size[1] / 2
const apseWalls = ['oculus-northwest', 'oculus-north', 'oculus-northeast']
/** each opening with its hole in the apse’s wall and in the wall of the Fortress’ curve behind it */
const openings = apseOpenings.map(opening => {
  const find = (candidates: ReadonlyArray<Wall>) => {
    const wall = candidates.find(value => value.holes?.some(hole => hole.name === opening.name))!
    return {
      wall,
      hole: wall.holes!.find(hole => hole.name === opening.name)!,
    }
  }
  return {
    opening,
    apse: find(walls.filter(wall => wall.id === apseWalls[opening.arc])),
    fortress: find(walls.filter(wall => wall.id.startsWith('fortress-curve_'))),
  }
})
const architecture = [...new Set(openings.flatMap(({apse, fortress}) => [apse.wall, fortress.wall]))].map(wall => ({
  wall,
  geometry: createArchitectureGeometry(wall),
}))
const grilles = openings.map(({opening, apse}) => new BarredOpeningGeometry(apse.wall, apse.hole, {
  bands: opening.bands,
  depth: fortressClearance,
}))
const vault = new RouteVaultGeometry(fortressCurve)
const ground = new OculusGroundGeometry
const material = new MeshBasicMaterial({side: DoubleSide})
const placed = (wall: Wall, geometry: ConstructorParameters<typeof Mesh>[0]) => {
  const mesh = new Mesh(geometry, material)
  mesh.position.set(...wall.center)
  mesh.rotation.y = wall.rotation
  mesh.updateMatrixWorld()
  return mesh
}
const stone = [
  ...architecture.flatMap(({wall, geometry}) => [geometry.surface, ...geometry.trim, ...geometry.cornice].map(part => placed(wall, part))),
  ...[vault.shell, vault.ribs, vault.paving, ...grilles.map(grille => grille.reveal)].map(geometry => new Mesh(geometry, material)),
]
const bars = grilles.map(grille => new Mesh(grille.bars, material))
const floor = new Mesh(ground, material)
afterAll(() => {
  for (const {geometry} of architecture) {
    geometry.dispose()
  }
  for (const grille of grilles) {
    grille.dispose()
  }
  vault.dispose()
  ground.dispose()
  material.dispose()
})
/** the polar angle of a point round the center of the apse’s arc an opening pierces */
const angleAround = ({arc}: {arc: number}, [x, , z]: Vec3) => {
  const {center} = oculusApse.arcs[arc]
  return Math.atan2(z - center[1], x - center[0])
}
describe('the apse’s barred gate and windows onto the Fortress', () => {
  test('a gate in the middle of the crown and a window in each shoulder, symmetric', () => {
    expect(openings.map(({opening, apse}) => [opening.name, apse.wall.id])).toEqual([['west_window', 'oculus-northwest'], ['gate', 'oculus-north'], ['east_window', 'oculus-northeast']])
    const [west, gate, east] = apseOpenings
    expect(apseOpeningPoint(gate)[0]).toBeCloseTo(0, 9)
    expect(apseOpeningPoint(west)[0]).toBeCloseTo(-apseOpeningPoint(east)[0], 9)
    expect(apseOpeningPoint(west)[1]).toBeCloseTo(apseOpeningPoint(east)[1], 9)
    // The windows stand toward the side walls, where the shoulders round off.
    expect(Math.abs(apseOpeningPoint(west)[0])).toBeGreaterThan(6)
    expect(gate.width).toBeGreaterThan(west.width)
    expect(gate.height).toBeGreaterThan(west.height)
  })
  test('each pierces the apse’s wall and the curve’s wall behind it as far round, so its jambs point to its arc’s center, from the same bottom to the same top', () => {
    for (const {opening, apse, fortress} of openings) {
      // The curve’s wall faces away from the arc’s center, so it runs the other way round.
      const jambs = ({wall, hole}: typeof apse) => [-1, 1].map(side => wallPosition(wall, hole.u + side * hole.width / 2, platformY + 1, 0)).toSorted((a, b) => angleAround(opening, a) - angleAround(opening, b))
      const fortressJambs = jambs(fortress)
      for (const [index, apseJamb] of jambs(apse).entries()) {
        expect(angleAround(opening, apseJamb)).toBeCloseTo(angleAround(opening, fortressJambs[index]), 6)
        expect(Math.hypot(fortressJambs[index][0] - apseJamb[0], fortressJambs[index][2] - apseJamb[2])).toBeCloseTo(fortressClearance, 6)
      }
      expect(apse.wall.center[1] + (apse.hole.bottom ?? 0)).toBeCloseTo(fortress.wall.center[1] + (fortress.hole.bottom ?? 0), 9)
      expect(apse.wall.center[1] + openingTop(apse.hole, apse.hole.u)).toBeCloseTo(fortress.wall.center[1] + openingTop(fortress.hole, fortress.hole.u), 9)
      expect(apse.wall.center[1] + (apse.hole.bottom ?? 0)).toBeCloseTo(platformY + opening.bottom, 9)
      // Behind each, the curve runs at the platform’s level, under a vault that springs above its casing.
      const [x, z] = apseOpeningPoint(opening, fortressClearance + fortressCurve.width / 2)
      const station = fortressCurve.stationAt(x, z)!
      expect(station.y).toBeCloseTo(platformY, 9)
      expect(station.height - fortressCurve.width / 2).toBeGreaterThan(opening.height + 0.17)
    }
    expect(apseOpenings.find(opening => opening.name === 'gate')!.bottom).toBe(0)
  })
  test('a lantern hangs behind each, and its light falls through the opening between the bars onto the platform', () => {
    const lanterns = [fortressLanterns.northwest, fortressLanterns.north, fortressLanterns.northeast]
    for (const [index, {opening, apse}] of openings.entries()) {
      const [x, z] = apseOpeningPoint(opening, fortressClearance + fortressCurve.width / 2)
      const behind = fortressCurve.route.project(x, z)!.along
      expect(Math.abs(lanterns[index] - behind)).toBeLessThan(0.3)
      const lamp = slopGallery.lamps().find(value => value.id === `fortress-lantern_${['northwest', 'north', 'northeast'][index]}`)!
      expect(lamp.shadow).toBe(true)
      const light = new Vector3(...lamp.position)
      // through points of the opening between two bars, over what falls onto a window’s sill and under what the casing over it on the Fortress’ side holds back
      const bottom = apse.hole.bottom ?? 0
      for (const fraction of [0.3, 0.5, 0.7]) {
        const y = apse.wall.center[1] + bottom + (openingTop(apse.hole, apse.hole.u) - bottom) * fraction
        const through = new Vector3(...wallPosition(apse.wall, apse.hole.u + 0.075, y, 0))
        const direction = through.clone().sub(light).normalize()
        const ray = new Raycaster(light, direction, 0, 30)
        const hits = ray.intersectObjects([...stone, floor])
        expect(`${opening.name} at ${fraction}: ${hits[0].object === floor ? 'platform' : `stone ${stone.indexOf(hits[0].object as (typeof stone)[number])}`}`).toBe(`${opening.name} at ${fraction}: platform`)
        expect(hits[0].point.y).toBeCloseTo(platformY, 4)
        expect(lamp.range! > hits[0].distance).toBe(true)
      }
      // A bar stands in the light’s way in the middle, and throws its shadow: they stand evenly spread, at most 15 cm apart.
      const count = Math.ceil(opening.width / 0.15) - 1
      const middle = apse.hole.u - opening.width / 2 + opening.width * (Math.floor(count / 2) + 1) / (count + 1)
      const bar = new Vector3(...wallPosition(apse.wall, middle, apse.wall.center[1] + bottom + 0.6, -fortressClearance / 2))
      const barRay = new Raycaster(light, bar.clone().sub(light).normalize(), 0, 30)
      const toBar = barRay.intersectObjects(bars)
      expect(toBar[0]?.object).toBe(bars[index])
    }
  })
  test('the bars stand closer than anyone can squeeze through, and the reveal closes the gap between both walls', () => {
    for (const [index, {apse}] of openings.entries()) {
      const positions = grilles[index].bars.getAttribute('position')
      expect(positions.count).toBeGreaterThan(0)
      const bottom = apse.hole.bottom ?? 0
      const y = apse.wall.center[1] + bottom + 0.9
      // Sideways along the gap between both walls, from the opening’s middle, the reveal closes it beyond the jamb.
      for (const side of [-1, 1]) {
        const start = new Vector3(...wallPosition(apse.wall, apse.hole.u, y, -fortressClearance / 2))
        const beyond = new Vector3(...wallPosition(apse.wall, apse.hole.u + side * (apse.hole.width / 2 + 0.2), y, -fortressClearance / 2))
        const ray = new Raycaster(start, beyond.clone().sub(start).normalize(), 0, start.distanceTo(beyond))
        const hits = ray.intersectObject(new Mesh(grilles[index].reveal, material))
        expect(hits.length).toBeGreaterThan(0)
      }
    }
  })
  test('a player walking up to the gate from the platform stops at its bars', () => {
    const world = new RAPIER.World({
      x: 0,
      y: -9.81,
      z: 0,
    })
    world.timestep = 1 / 60
    try {
      for (const {wall, geometry} of architecture) {
        for (const args of geometry.collision) {
          const rotation = new Quaternion
          world.createCollider(RAPIER.ColliderDesc.trimesh(...args).setTranslation(...wall.center).setRotation(rotation.setFromAxisAngle(new Vector3(0, 1, 0), wall.rotation)))
        }
      }
      for (const geometry of [ground, vault.paving, ...grilles.flatMap(grille => [grille.bars, grille.reveal])]) {
        world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(geometry)))
      }
      const gate = apseOpenings.find(opening => opening.name === 'gate')!
      const [, gateZ] = apseOpeningPoint(gate)
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0.05, platformY + 0.04, gateZ + 3))
      const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
      const motor = new EgoMotor(RAPIER, world, body, collider)
      try {
        const facing = new Quaternion
        for (let i = 0; i < 240; i++) {
          motor.step(world.timestep, {
            forward: true,
            sprint: true,
          }, facing)
          world.step()
        }
        expect(body.translation().z).toBeGreaterThan(gateZ)
        expect(body.translation().z).toBeLessThan(gateZ + 0.6)
        expect(body.translation().y).toBeCloseTo(platformY + 0.02, 2)
      } finally {
        motor.dispose()
      }
    } finally {
      world.free()
    }
  })
})

import type {RouteLine, RoutePiece} from '../../src/lib/gallery/passages/PassageRoute.ts'
import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import EgoMotor from 'ego-player/motor'
import {DoubleSide, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {corniceBands, vaultShellThickness, wallFace} from '../../src/lib/gallery/architectureDimensions.ts'
import {bastionMouth} from '../../src/lib/gallery/bastion.ts'
import {slabCorners} from '../../src/lib/gallery/floorPolygons.ts'
import {fortressCurve, fortressLinkStart} from '../../src/lib/gallery/fortress.ts'
import {fortressLink, fortressNetwork} from '../../src/lib/gallery/fortressNetwork.ts'
import lodge from '../../src/lib/gallery/lodge.ts'
import lowerGallery from '../../src/lib/gallery/lowerGallery.ts'
import oculusApse from '../../src/lib/gallery/oculusApse.ts'
import Passage from '../../src/lib/gallery/passages/Passage.ts'
import RouteVaultGeometry from '../../src/lib/gallery/passages/RouteVaultGeometry.ts'
import VaultGeometry from '../../src/lib/gallery/passages/VaultGeometry.ts'
import {openingArc} from '../../src/lib/placement/wallGeometry.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'
import walls, {floorHeight, insideGallery, roomAt} from './fixtures/gallery.ts'

await RAPIER.init()
const {route} = fortressLink
const architecture = walls.filter(wall => ['fortress', 'lodge', 'oculus'].includes(wall.room)).map(wall => ({
  wall,
  geometry: createArchitectureGeometry(wall),
}))
const vaults = fortressNetwork.map(passage => (passage instanceof Passage ? new VaultGeometry(passage) : new RouteVaultGeometry(passage)))
afterAll(() => {
  for (const {geometry} of architecture) {
    geometry.dispose()
  }
  for (const vault of vaults) {
    vault.dispose()
  }
})
const wallById = (id: string) => walls.find(wall => wall.id === id)!
const lodgeSouthZ = lodge.center[1] + lodge.size[1] / 2
const mouthNorthZ = bastionMouth.path[0][1] - bastionMouth.width / 2
const mouthWestX = bastionMouth.path[1][0] - bastionMouth.width / 2
const oculusWestX = lowerGallery.oculus.center[0] - lowerGallery.oculus.size[0] / 2
const [westShoulder] = oculusApse.arcs
const straight = (piece: RoutePiece | undefined): piece is RouteLine => piece?.kind === 'line'
/** Where the line straight across from the station toward a side lies `out` meters from the centerline. */
const across = (station: ReturnType<typeof route.at>, side: number, out: number) => [station.point[0] - Math.sin(station.heading) * side * out, station.point[1] + Math.cos(station.heading) * side * out] as const
const climb = fortressCurve.route.pieces.at(-1)
const landing = fortressCurve.route.pieces.at(-2)
if (!straight(climb) || !straight(landing)) {
  throw new Error('The curve ends in a level landing and its straight climb toward the Lodge.')
}
test('both wings and the link belong to one Fortress', () => {
  expect(slopGallery.rooms.some(room => (room.id as string) === 'bastion')).toBe(false)
  expect(slopGallery.rooms.filter(room => room.id === 'fortress')).toHaveLength(1)
  for (let along = 0; along <= route.length; along += 0.1) {
    const {point: [x, z], y} = route.at(along)
    const position: Vec3 = [x, y + 1.6, z]
    expect(roomAt(position)).toBe('fortress')
    expect(insideGallery(position)).toBe(true)
    expect(floorHeight(position)).toBeCloseTo(y, 5)
    if (along > 0.3 && along < route.length - 0.1) {
      expect(Math.abs(route.at(along + 0.01).y - route.at(along - 0.01).y) / 0.02).toBeLessThan(0.25)
    }
  }
  // It leaves the curve’s landing heading south, level with it, and ends in the mouth’s north wall at its elbow, level with the mouth, its west wall in line with the mouth’s.
  expect(route.start).toEqual(fortressLinkStart.point)
  expect(route.start[1]).toBeCloseTo(landing.start[1] + fortressCurve.width / 2, 9)
  expect([route.y, route.heading]).toEqual([fortressLinkStart.y, Math.PI / 2])
  expect(route.end.point[0] - fortressLink.width / 2).toBeCloseTo(mouthWestX, 9)
  expect(route.end.point[1]).toBeCloseTo(mouthNorthZ, 9)
  expect(route.end.heading).toBeCloseTo(Math.PI / 2, 9)
  expect(route.end.y).toBe(bastionMouth.floorY)
  expect(route.end.height).toBe(bastionMouth.height)
})
test('beside the Lodge, the tunnel takes up all the room between the Lodge and the mouth of the western climb', () => {
  expect(fortressLink.width).toBeCloseTo(3.75, 9)
  const strip = route.pieces.filter(straight).find(piece => Math.abs(piece.heading - Math.PI) < 1e-9)!
  const station = route.at(strip.from + strip.length / 2)
  // The back of its vault 1 cm short of the face of the Lodge’s south wall
  expect(across(station, 1, fortressLink.width / 2 + vaultShellThickness)[1]).toBeCloseTo(lodgeSouthZ - wallFace + 0.01, 9)
  // The faces of its walls 1 cm in front of the back of the mouth’s vault, and the back of its own 1 cm short of the face of the mouth’s wall
  expect(across(station, -1, fortressLink.width / 2 - wallFace)[1]).toBeCloseTo(mouthNorthZ - vaultShellThickness - 0.01, 9)
  expect(across(station, -1, fortressLink.width / 2 + vaultShellThickness)[1]).toBeCloseTo(mouthNorthZ + wallFace - 0.01, 9)
  // It runs that wide from past the Lodge’s east wall into the turn toward the mouth.
  expect(strip.start[0]).toBeGreaterThan(lodge.center[0] + lodge.size[0] / 2)
  expect(route.pieces.at(-1)!.from).toBeCloseTo(strip.from + strip.length, 9)
})
test('the link’s walls and vault keep out of the Lodge, the Oculus and its apse, the curve’s climb and the mouth', () => {
  for (const station of route.stations(0, route.length, 1 / 64)) {
    for (const side of [-1, 1]) {
      const [x, z] = across(station, side, fortressLink.width / 2 + vaultShellThickness)
      if (x < lodge.center[0] + lodge.size[0] / 2 + wallFace) {
        expect(z).toBeGreaterThan(lodgeSouthZ - wallFace)
      }
      expect(x).toBeLessThan(oculusWestX + wallFace)
      // short of the face of the apse’s west shoulder, where it reaches past the Oculus’ west wall
      if (z < oculusApse.northZ) {
        expect(Math.hypot(x - westShoulder.center[0], z - westShoulder.center[1])).toBeGreaterThan(westShoulder.radius - wallFace)
      }
      // behind the back of the vault of the curve’s climb toward the Lodge, wherever they stand as high
      if (x < climb.start[0]) {
        const beside = fortressCurve.route.at(climb.from + Math.min(climb.start[0] - x, climb.length))
        if (station.y + station.height + vaultShellThickness > beside.y + beside.height - fortressCurve.width / 2) {
          expect(z).toBeGreaterThan(climb.start[1] + fortressCurve.width / 2 + vaultShellThickness)
        }
      }
      // in front of the back of the mouth’s vault along its run east, short of its elbow, where the tunnel ends
      const [faceX, faceZ] = across(station, side, fortressLink.width / 2 - wallFace)
      if (faceX > bastionMouth.path[1][0] + bastionMouth.width / 2) {
        expect(faceZ).toBeLessThan(mouthNorthZ - vaultShellThickness + 1e-9)
      }
    }
  }
})
const casted = (geometries: ReadonlyArray<ReturnType<typeof createArchitectureGeometry>['surface']>, u: number, y: number) => {
  const material = new MeshBasicMaterial({side: DoubleSide})
  try {
    const raycaster = new Raycaster(new Vector3(u, y, 1), new Vector3(0, 0, -1))
    return geometries.flatMap(geometry => raycaster.intersectObject(new Mesh(geometry, material)))
  } finally {
    material.dispose()
  }
}
/** Expects the opening to be bare and as wide and as high as the link’s vault, ending at the faces of its walls. */
const expectVaultSection = (hole: NonNullable<ReturnType<typeof wallById>['holes']>[number], crown: number) => {
  expect(hole.casing).toBe(false)
  expect(hole.width).toBeCloseTo(fortressLink.width - wallFace * 2, 9)
  expect(hole.height).toBe(crown)
  const {radius, center} = openingArc(hole)
  expect(radius).toBeCloseTo(fortressLink.width / 2, 9)
  expect(center).toBeCloseTo(crown - fortressLink.width / 2, 9)
}
test('it opens out of the curve’s level landing through a bare arch the size of its vault, which takes up all of the landing’s straight wall', () => {
  const wall = walls.find(value => value.id.startsWith('fortress-curve_') && value.holes?.some(hole => hole.name === 'link'))!
  const hole = wall.holes!.find(({name}) => name === 'link')!
  expectVaultSection(hole, fortressLinkStart.height)
  expect(wall.curveRadius).toBeUndefined()
  expect(Math.cos(wall.rotation)).toBeCloseTo(-1, 9)
  expect(wall.center[1]).toBe(fortressLinkStart.y)
  // facing north into the curve, so its u runs west
  const [eastJamb, westJamb] = [wall.center[0] - hole.u + hole.width / 2, wall.center[0] - hole.u - hole.width / 2]
  expect(eastJamb).toBeCloseTo(route.start[0] + fortressLink.width / 2 - wallFace, 9)
  expect(westJamb).toBeCloseTo(route.start[0] - fortressLink.width / 2 + wallFace, 9)
  // The wall reaches from the corner where the tunnel’s east wall runs on to where its west wall runs on and the climb’s wall begins.
  expect(wall.center[0] + wall.width / 2).toBeCloseTo(route.start[0] + fortressLink.width / 2, 9)
  expect(wall.center[0] - wall.width / 2).toBeCloseTo(route.start[0] - fortressLink.width / 2, 9)
  expect(climb.start[0]).toBeCloseTo(route.start[0] - fortressLink.width / 2, 9)
  // The floor stays level across the doorway, up to the climb.
  for (let x = westJamb; x <= eastJamb; x += 0.05) {
    expect(fortressCurve.floorAt(x, route.start[1] - 0.3)).toBe(fortressLinkStart.y)
  }
  expect(climb.ramp!.from).toBeCloseTo(climb.from, 9)
  // The straight walls of the landing’s corner keep nearly as far from the apse’s west shoulder as the curve does all round it.
  const left = fortressCurve.outlines.find(outline => outline.side === -1)!
  for (const [index, corner] of left.corners.slice(0, -1).entries()) {
    const next = left.corners[index + 1]
    for (let share = 0; share <= 1; share += 0.05) {
      const [x, z] = [corner[0] + (next[0] - corner[0]) * share, corner[1] + (next[1] - corner[1]) * share]
      expect(Math.hypot(x - westShoulder.center[0], z - westShoulder.center[1]) - westShoulder.radius).toBeGreaterThan(0.29)
    }
  }
})
test('it opens into the mouth’s elbow through a bare arch the size of its vault, which cuts through the cornice', () => {
  const wall = wallById('fortress-climb_mouth_wall_2')
  const hole = wall.holes!.find(({name}) => name === 'link')!
  expectVaultSection(hole, bastionMouth.height)
  // Its west jamb stands in line with the face of the mouth’s west wall.
  expect(wall.center[0] + hole.u - hole.width / 2).toBeCloseTo(mouthWestX + wallFace, 9)
  const {geometry} = architecture.find(entry => entry.wall === wall)!
  // No cornice runs across it, but it still runs beside it, mitered round the corner into the mouth’s west wall.
  const corner = mouthWestX + 0.3 - wall.center[0]
  for (const {drop} of corniceBands) {
    const y = wall.height - drop
    expect(casted(geometry.cornice, hole.u, y)).toHaveLength(0)
    expect(casted(geometry.cornice, corner, y).length).toBeGreaterThan(0)
  }
  // No casing frames it: right beside its east jamb, the wall’s face is all there is.
  expect(casted(geometry.trim, hole.u + hole.width / 2 + 0.05, 1)).toHaveLength(0)
  // Its west jamb opens the corner down to the floor, so both baseboards there run on square, the mouth’s west wall’s straight into the tunnel’s, and only the cornices are mitered.
  const west = wallById('fortress-climb_mouth_wall_3')
  expect(west.miters).toEqual([0, 1])
  expect(west.baseboardMiters).toEqual([0, 0])
  expect(wall.miters).toEqual([1, 0])
  expect(wall.baseboardMiters).toEqual([0, 0])
})
for (const returning of [false, true]) {
  for (const sprint of [false, true]) {
    test(`the player crosses both doorways and the link, returning ${returning}, sprint ${sprint}`, () => {
      const world = new RAPIER.World({
        x: 0,
        y: -9.81,
        z: 0,
      })
      world.timestep = 1 / 60
      for (const {wall, geometry} of architecture) {
        const rotation = new Quaternion
        rotation.setFromAxisAngle(new Vector3(0, 1, 0), wall.rotation)
        for (const args of geometry.collision) {
          world.createCollider(RAPIER.ColliderDesc.trimesh(...args).setTranslation(...wall.center).setRotation(rotation))
        }
      }
      for (const vault of vaults) {
        for (const geometry of [vault.shell, vault.ribs, ...vault instanceof RouteVaultGeometry ? [vault.paving] : []]) {
          world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(geometry)))
        }
      }
      for (const passage of fortressNetwork) {
        if (passage instanceof Passage) {
          for (const floor of passage.floors) {
            world.createCollider(RAPIER.ColliderDesc.convexHull(slabCorners(floor, passage.floorY - 0.24, passage.floorY))!)
          }
        }
      }
      // from the middle of the curve’s landing, a couple of meters north of the doorway
      const entrance = fortressCurve.route.at(fortressCurve.route.project(route.start[0], route.start[1] - 2)!.along)
      const path = [entrance.point, ...Array.from({length: Math.ceil(route.length / 0.4)}, (_, i) => route.at(i * 0.4).point), route.end.point, bastionMouth.path[1]]
      if (returning) {
        path.reverse()
      }
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(path[0][0], (returning ? bastionMouth.floorY : entrance.y) + 0.04, path[0][1]))
      const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
      const motor = new EgoMotor(RAPIER, world, body, collider)
      const facing = new Quaternion
      try {
        let target = 1
        for (let frame = 0; frame < 60 * 45 && target < path.length; frame++) {
          const position = body.translation()
          const dx = path[target][0] - position.x
          const dz = path[target][1] - position.z
          if (Math.hypot(dx, dz) < 0.15) {
            target++
            continue
          }
          facing.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(-dx, -dz))
          motor.step(world.timestep, {
            forward: true,
            sprint,
          }, facing)
          world.step()
          expect(position.y).toBeGreaterThan(-6.1)
        }
        expect({
          target,
          position: body.translation(),
        }).toMatchObject({target: path.length})
        for (let frame = 0; frame < 60; frame++) {
          motor.step(world.timestep, {}, facing)
          world.step()
        }
        expect(body.translation().y).toBeCloseTo((returning ? entrance.y : bastionMouth.floorY) + 0.02, 2)
        expect(motor.grounded).toBe(true)
      } finally {
        motor.dispose()
        world.free()
      }
    })
  }
}

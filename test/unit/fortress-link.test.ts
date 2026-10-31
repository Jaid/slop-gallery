import type {RouteLine, RoutePiece} from '../../src/lib/gallery/passages/PassageRoute.ts'
import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import EgoMotor from 'ego-player/motor'
import {DoubleSide, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {corniceBands, vaultShellThickness, wallFace, wallOpeningTrim} from '../../src/lib/gallery/architectureDimensions.ts'
import {bastionMouth} from '../../src/lib/gallery/bastion.ts'
import {slabCorners} from '../../src/lib/gallery/floorPolygons.ts'
import {fortressCurve, fortressLinkStart} from '../../src/lib/gallery/fortress.ts'
import {fortressLink, fortressLinkDoorway, fortressLinkPassages, fortressLinkScreen, fortressNetwork} from '../../src/lib/gallery/fortressNetwork.ts'
import lodge from '../../src/lib/gallery/lodge.ts'
import lowerGallery from '../../src/lib/gallery/lowerGallery.ts'
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
/** Where the line straight across from the station toward a side lies `out` meters from the centerline. */
const straight = (piece: RoutePiece | undefined): piece is RouteLine => piece?.kind === 'line'
const across = (station: ReturnType<typeof route.at>, side: number, out: number) => [station.point[0] - Math.sin(station.heading) * side * out, station.point[1] + Math.cos(station.heading) * side * out] as const
test('both wings and the link belong to one Fortress', () => {
  expect(slopGallery.rooms.some(room => (room.id as string) === 'bastion')).toBe(false)
  expect(slopGallery.rooms.filter(room => room.id === 'fortress')).toHaveLength(1)
  for (const passage of fortressLinkPassages) {
    for (let along = 0; along <= passage.route.length; along += 0.1) {
      const {point: [x, z], y} = passage.route.at(along)
      const position: Vec3 = [x, y + 1.6, z]
      expect(roomAt(position)).toBe('fortress')
      expect(insideGallery(position)).toBe(true)
      expect(floorHeight(position)).toBeCloseTo(y, 5)
      if (along > 0.3 && along < passage.route.length - 0.1) {
        expect(Math.abs(passage.route.at(along + 0.01).y - passage.route.at(along - 0.01).y) / 0.02).toBeLessThan(0.25)
      }
    }
  }
  // The doorway passage stays level with the curve’s bend and hands over to the tunnel heading south, where the screen stands across it.
  const doorway = fortressLinkDoorway.route
  expect([doorway.start, doorway.end.y]).toEqual([[fortressLinkStart.point[0] - Math.cos(fortressLinkStart.heading) * 0.25, fortressLinkStart.point[1] - Math.sin(fortressLinkStart.heading) * 0.25], fortressLinkStart.y])
  expect(doorway.end.heading).toBeCloseTo(Math.PI / 2, 9)
  expect(route.start).toEqual(doorway.end.point)
  expect(route.y).toBe(fortressLinkStart.y)
  expect(fortressLinkScreen.center).toEqual([route.start[0], route.y, route.start[1]])
  // It ends in the mouth’s north wall at its elbow, level with the mouth, its west wall in line with the mouth’s.
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
test('the link’s walls and vaults keep out of the Lodge, the Oculus, the curve’s climb and the mouth', () => {
  const climb = fortressCurve.route.pieces.at(-1)
  if (!straight(climb)) {
    throw new Error('The curve ends in its straight climb toward the Lodge.')
  }
  for (const passage of fortressLinkPassages) {
    for (const station of passage.route.stations(0.3, passage.route.length, 1 / 64)) {
      for (const side of [-1, 1]) {
        const [x, z] = across(station, side, passage.reach(station, side) + vaultShellThickness)
        if (x < lodge.center[0] + lodge.size[0] / 2 + wallFace) {
          expect(z).toBeGreaterThan(lodgeSouthZ - wallFace)
        }
        expect(x).toBeLessThan(oculusWestX + wallFace)
        // behind the back of the vault of the curve’s climb toward the Lodge
        if (x < climb.start[0]) {
          expect(z).toBeGreaterThan(climb.start[1] + fortressCurve.width / 2 + vaultShellThickness)
        }
        // in front of the back of the mouth’s vault along its run east, short of its elbow, where the tunnel ends
        const [faceX, faceZ] = across(station, side, passage.reach(station, side) - wallFace)
        if (faceX > bastionMouth.path[1][0] + bastionMouth.width / 2) {
          expect(faceZ).toBeLessThan(mouthNorthZ - vaultShellThickness + 1e-9)
        }
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
test('it opens into the mouth’s elbow through a bare arch the size of its vault, which cuts through the cornice', () => {
  const wall = wallById('fortress-climb_mouth_wall_2')
  const hole = wall.holes!.find(({name}) => name === 'link')!
  expect(hole.casing).toBe(false)
  // Its jambs stand at the faces of the tunnel’s walls, the west one in line with the face of the mouth’s west wall, and its arch is the tunnel’s barrel.
  expect(wall.center[0] + hole.u - hole.width / 2).toBeCloseTo(mouthWestX + wallFace, 9)
  expect(hole.width).toBeCloseTo(fortressLink.width - wallFace * 2, 9)
  expect(hole.height).toBe(bastionMouth.height)
  const {radius, center} = openingArc(hole)
  expect(radius).toBeCloseTo(fortressLink.width / 2, 9)
  expect(center).toBeCloseTo(bastionMouth.height - fortressLink.width / 2, 9)
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
  // Its west jamb opens the corner down to the floor, so the mouth’s west wall runs its baseboard on square, straight into the tunnel’s, and only miters its cornice.
  const west = wallById('fortress-climb_mouth_wall_3')
  expect(west.miters).toEqual([0, 1])
  expect(west.baseboardMiters).toEqual([0, 0])
  expect(wall.miters).toEqual([1, 0])
  expect(wall.baseboardMiters).toBeUndefined()
})
test('the screen across the tunnel’s start opens into the doorway passage through an arch the size of that passage’s vault, which the doorway from the curve’s bend opens into', () => {
  const screen = wallById('fortress-link_screen')
  expect(screen).toMatchObject({
    rotation: 0,
    width: fortressLink.width,
    height: bastionMouth.height - 0.3,
    sticky: false,
    trimStyle: 'none',
  })
  const {geometry} = architecture.find(entry => entry.wall === screen)!
  expect([geometry.trim, geometry.cornice]).toEqual([[], []])
  const [arch] = screen.holes!
  expect(arch).toMatchObject({
    name: 'doorway',
    u: 0,
    profile: 'arch',
    height: bastionMouth.height,
  })
  expect(arch.width).toBeCloseTo(fortressLinkDoorway.width - wallFace * 2, 9)
  expect(openingArc(arch).radius).toBeCloseTo(fortressLinkDoorway.width / 2, 9)
  // The doorway sits on the bend’s outer wall, its casing reaching as far as that wall does toward the climb.
  const bend = walls.find(wall => wall.holes?.some(hole => hole.name === 'link') && wall.id.startsWith('fortress-curve_'))!
  const doorway = bend.holes!.find(hole => hole.name === 'link')!
  expect(Math.abs(doorway.u) + doorway.width / 2 + wallOpeningTrim).toBeCloseTo(bend.width / 2, 6)
})
for (const returning of [false, true]) {
  for (const sprint of [false, true]) {
    test(`the player crosses both new doorways and the curved link, returning ${returning}, sprint ${sprint}`, () => {
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
      const doorway = fortressLinkDoorway.route
      const entrance = fortressCurve.route.at(fortressCurve.route.project(...doorway.start)!.along)
      const path = [entrance.point, ...fortressLinkPassages.flatMap(passage => Array.from({length: Math.ceil(passage.route.length / 0.4)}, (_, i) => passage.route.at(i * 0.4).point)), route.end.point, bastionMouth.path[1]]
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

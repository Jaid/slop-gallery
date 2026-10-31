import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import EgoMotor from 'ego-player/motor'
import {Quaternion, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {bastionMouth} from '../../src/lib/gallery/bastion.ts'
import {slabCorners} from '../../src/lib/gallery/floorPolygons.ts'
import {fortressCurve} from '../../src/lib/gallery/fortress.ts'
import {fortressLink, fortressNetwork} from '../../src/lib/gallery/fortressNetwork.ts'
import lodge from '../../src/lib/gallery/lodge.ts'
import lowerGallery from '../../src/lib/gallery/lowerGallery.ts'
import Passage from '../../src/lib/gallery/passages/Passage.ts'
import RouteVaultGeometry from '../../src/lib/gallery/passages/RouteVaultGeometry.ts'
import VaultGeometry from '../../src/lib/gallery/passages/VaultGeometry.ts'
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
  expect(route.end.point[0]).toBeCloseTo(bastionMouth.path[1][0], 9)
  expect(route.end.point[1]).toBeCloseTo(bastionMouth.path[0][1] - bastionMouth.width / 2, 9)
  expect(route.end.y).toBe(bastionMouth.floorY)
})
test('the link’s walls clear Lodge and the Oculus along the narrow strip', () => {
  for (const station of route.stations(0.3, route.length, 1 / 64)) {
    for (const side of [-1, 1]) {
      const reach = fortressLink.width / 2 + 0.22
      const x = station.point[0] - Math.sin(station.heading) * side * reach
      const z = station.point[1] + Math.cos(station.heading) * side * reach
      if (x < lodge.center[0] + lodge.size[0] / 2 + 0.105) {
        expect(z).toBeGreaterThan(lodge.center[1] + lodge.size[1] / 2 + 0.105)
      }
      expect(x).toBeLessThan(lowerGallery.oculus.center[0] - lowerGallery.oculus.size[0] / 2 - 0.105)
    }
  }
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
      const entrance = fortressCurve.route.at(fortressCurve.route.project(...route.start)!.along)
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

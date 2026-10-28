import type {Vec3} from '../../src/lib/gallery/types.ts'

import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import EgoMotor from 'ego-player/motor'
import {Euler, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry, wallFace} from '../../src/lib/gallery/architecture.ts'
import lowerGallery, {tunnelFloorHeight, tunnelSlope} from '../../src/lib/gallery/lowerGallery.ts'
import oculusBalcony from '../../src/lib/gallery/oculusBalcony.ts'
import oculusTower from '../../src/lib/gallery/oculusTower.ts'
import SlopedBoxGeometry from '../../src/lib/gallery/SlopedBoxGeometry.ts'
import tunnelDisplays, {displayStairway, tunnelDisplayWindow} from '../../src/lib/gallery/tunnelDisplays.ts'
import walls, {floorHeight, galleryPlacement, insideGallery, roomAt} from '../../src/lib/gallery/walls.ts'

await RAPIER.init()
const {tunnel} = lowerGallery
const floorY = tunnelFloorHeight((tunnel.northZ + tunnel.southZ) / 2)
const balconyY = oculusBalcony.position[1] + oculusBalcony.size[1] / 2
type Display = (typeof tunnelDisplays)[number]
/** the colliders between the Oculus balcony and the display: the balcony, the Oculus’ south wall with its doors, the stairway and the display’s shell */
function stairwayWorld(display: Display) {
  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  world.timestep = 1 / 60
  for (const wall of [walls.find(value => value.id === 'oculus-south')!, ...display.stairway.walls]) {
    const geometry = createArchitectureGeometry(wall)
    const wallRotation = new Quaternion
    wallRotation.setFromAxisAngle(new Vector3(0, 1, 0), wall.rotation)
    for (const collision of geometry.collision) {
      world.createCollider(RAPIER.ColliderDesc.trimesh(...collision).setTranslation(...wall.center).setRotation(wallRotation))
    }
    geometry.dispose()
  }
  const box = (position: Vec3, size: Vec3) => world.createCollider(RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2).setTranslation(...position))
  box(oculusBalcony.position, oculusBalcony.size)
  for (const block of display.stairway.flight.blocks) {
    box(block.position, block.size)
  }
  for (const beam of [display.stairway.roof, ...display.stairway.rails]) {
    const beamRotation = new Quaternion
    box(beam.position, beam.size).setRotation(beamRotation.setFromEuler(new Euler(...beam.rotation)))
  }
  for (const {position, size} of [...display.shell, display.stairway.floor, display.stairway.ceiling]) {
    const slab = new SlopedBoxGeometry(...size, tunnelSlope)
    slab.translate(...position)
    world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(slab)))
    slab.dispose()
  }
  return world
}
describe('tower-wide tunnel with display rooms reached from the Oculus balcony', () => {
  test('both portals and floor bounds follow the tower-wide tunnel, and the displays join the Oculus', () => {
    expect(tunnel.width).toBe(oculusTower.radius * 2)
    for (const id of ['oculus-south', 'moonfall-north']) {
      expect(walls.find(wall => wall.id === id)!.holes![0].width).toBe(tunnel.width)
    }
    expect(tunnelDisplays).toHaveLength(2)
    expect(tunnelDisplays[0].center[0]).toBe(-tunnelDisplays[1].center[0])
    for (const display of tunnelDisplays) {
      expect(display.exhibits).toHaveLength(3)
      expect(insideGallery([display.center[0], floorY + 1.6, display.center[1]])).toBe(true)
      expect(roomAt([display.center[0], floorY + 1.6, display.center[1]])).toBe('oculus')
      expect(insideGallery([Math.sign(display.frontX) * 1.8, floorY + 1.6, display.center[1]])).toBe(true)
      const outerX = display.stairway.x + Math.sign(display.frontX) * (displayStairway.width / 2 + 0.3)
      for (const z of [-10, display.stairway.landing.center[1]]) {
        expect(insideGallery([outerX, tunnelFloorHeight(z) + 1.6, z])).toBe(false)
      }
      for (const exhibit of display.exhibits) {
        expect(Math.abs(exhibit.position[0] - display.center[0]) + 0.7).toBeLessThan(display.size[0] / 2)
        expect(Math.abs(exhibit.position[2] - display.center[1]) + 0.7).toBeLessThan(display.size[1] / 2)
      }
    }
    const exhibitKinds = new Set(tunnelDisplays.flatMap(display => display.exhibits.map(exhibit => exhibit.kind)))
    expect(exhibitKinds.size).toBe(6)
  })
  for (const display of tunnelDisplays) {
    const {flight, landing} = display.stairway
    test(`${display.side}: a door from the balcony opens onto the stairway, whose steps and landing are part of the Oculus`, () => {
      expect(flight.start).toEqual([display.stairway.x, balconyY, tunnel.northZ])
      expect(Math.abs(flight.start[0] - oculusBalcony.position[0]) + displayStairway.width / 2).toBeLessThan(oculusBalcony.size[0] / 2)
      expect(flight.end[1]).toBeCloseTo(tunnelFloorHeight(flight.end[2]))
      expect(flight.rise).toBeLessThan(0.18)
      expect(flight.run).toBeGreaterThan(0.45)
      const wall = walls.find(value => value.id === 'oculus-south')!
      const geometry = createArchitectureGeometry(wall)
      const material = new MeshBasicMaterial
      const meshes = [geometry.surface, ...geometry.trim].map(part => {
        const mesh = new Mesh(part, material)
        mesh.position.set(...wall.center)
        mesh.rotation.y = wall.rotation
        mesh.updateMatrixWorld(true)
        return mesh
      })
      try {
        for (const offset of [-1, 0, 1]) {
          for (const height of [0.02, 1.6, displayStairway.doorHeight - 0.1]) {
            const ray = new Raycaster(new Vector3(flight.start[0] + offset, balconyY + height, tunnel.northZ - 0.5), new Vector3(0, 0, 1), 0, 1)
            expect(ray.intersectObjects(meshes)).toHaveLength(0)
          }
        }
        for (const [offset, height] of [[0, displayStairway.doorHeight + 0.15], [-1.4, 1.6], [1.4, 1.6]]) {
          const ray = new Raycaster(new Vector3(flight.start[0] + offset, balconyY + height, tunnel.northZ - 0.5), new Vector3(0, 0, 1), 0, 1)
          expect(ray.intersectObjects(meshes).length).toBeGreaterThan(0)
        }
      } finally {
        geometry.dispose()
        material.dispose()
      }
      for (const block of flight.blocks) {
        const position: Vec3 = [block.position[0], block.top + 1.6, block.position[2]]
        expect(insideGallery(position)).toBe(true)
        expect(roomAt(position)).toBe('oculus')
        expect(floorHeight(position)).toBeCloseTo(block.top)
      }
      const landingPosition: Vec3 = [landing.center[0], tunnelFloorHeight(landing.center[1]) + 1.6, landing.center[1]]
      expect(insideGallery(landingPosition)).toBe(true)
      expect(roomAt(landingPosition)).toBe('oculus')
      expect(floorHeight(landingPosition)).toBeCloseTo(tunnelFloorHeight(landing.center[1]))
    })
    for (const returning of [false, true]) {
      test(`${display.side}: the player walks ${returning ? 'up from the display to the balcony' : 'down from the balcony into the display'}`, () => {
        const world = stairwayWorld(display)
        const landingZ = (flight.end[2] + display.center[1] + display.size[1] / 2) / 2
        const path: Array<[number, number]> = [[flight.start[0], tunnel.northZ - 1], [flight.start[0], landingZ], [display.center[0], landingZ], [display.center[0], display.center[1]]]
        if (returning) {
          path.reverse()
        }
        const [start] = path
        const startY = returning ? tunnelFloorHeight(start[1]) : balconyY
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(start[0], startY + 0.04, start[1]))
        const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
        const motor = new EgoMotor(RAPIER, world, body, collider)
        const facing = new Quaternion
        try {
          for (const target of path.slice(1)) {
            const distance = () => Math.hypot(body.translation().x - target[0], body.translation().z - target[1])
            for (let i = 0; i < 60 * 12 && distance() > 0.15; i++) {
              const {x, y, z} = body.translation()
              facing.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(x - target[0], z - target[1]))
              motor.step(world.timestep, {forward: true}, facing)
              world.step()
              expect(insideGallery([x, y + 1.6, z])).toBe(true)
              expect(roomAt([x, y + 1.6, z])).toBe('oculus')
            }
            expect(distance()).toBeLessThan(0.15)
          }
          const end = path.at(-1)!
          expect(body.translation().y).toBeCloseTo((returning ? balconyY : tunnelFloorHeight(end[1])) + 0.02, 1)
          expect(motor.grounded).toBe(true)
          expect(motor.crouching).toBe(false)
        } finally {
          motor.dispose()
          world.free()
        }
      })
    }
    test(`${display.side}: windows are real openings with glass collision, solid sills and a closed room shell`, () => {
      const wall = walls.find(value => value.id === `oculus-tunnel-${display.side}`)!
      const geometry = createArchitectureGeometry(wall)
      const material = new MeshBasicMaterial
      const opaque = [geometry.surface, ...geometry.trim].map(part => new Mesh(part, material))
      const glass = geometry.glazing.map(part => new Mesh(part, material))
      const world = new RAPIER.World({
        x: 0,
        y: 0,
        z: 0,
      })
      try {
        expect(glass).toHaveLength(1)
        for (const collision of geometry.collision) {
          world.createCollider(RAPIER.ColliderDesc.trimesh(...collision))
        }
        world.step()
        for (const u of [-4.8, -2.5, 0, 2.5, 4.8]) {
          for (const y of [0.6, 1.62, 2.8]) {
            for (const side of [-1, 1]) {
              const origin = new Vector3(u, y + u * wall.slope!, side)
              const direction = new Vector3(0, 0, -side)
              const ray = new Raycaster(origin, direction, 0, 2)
              expect(ray.intersectObjects(opaque)).toHaveLength(0)
              const hit = ray.intersectObjects(glass)[0]
              expect(hit.point.z).toBeCloseTo((wallFace + side * tunnelDisplayWindow.glassThickness) / 2, 6)
              expect(world.castRay(new RAPIER.Ray(origin, direction), 2, true)!.timeOfImpact).toBeCloseTo(hit.distance, 6)
            }
          }
        }
        for (const [u, y] of [[0, 0.3], [0, 3], [-tunnelDisplayWindow.width / 2 - 0.2, 1.6], [tunnelDisplayWindow.width / 2 + 0.2, 1.6]]) {
          const surroundRay = new Raycaster(new Vector3(u, y + u * wall.slope!, 1), new Vector3(0, 0, -1), 0, 2)
          expect(surroundRay.intersectObjects(opaque).length).toBeGreaterThan(0)
        }
      } finally {
        world.free()
        geometry.dispose()
        material.dispose()
      }
      const shell = new RAPIER.World({
        x: 0,
        y: 0,
        z: 0,
      })
      try {
        for (const box of display.shell) {
          const slab = new SlopedBoxGeometry(...box.size, tunnelSlope)
          slab.translate(...box.position)
          shell.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(slab)))
          slab.dispose()
        }
        shell.step()
        const origin = new Vector3(display.center[0], floorY + 1.6, display.center[1])
        for (const direction of [new Vector3(Math.sign(display.frontX), 0, 0), new Vector3(0, 1, 0), new Vector3(0, -1, 0), new Vector3(0, 0, 1), new Vector3(0, 0, -1)]) {
          expect(shell.castRay(new RAPIER.Ray(origin, direction), 10, true)).not.toBeNull()
        }
      } finally {
        shell.free()
      }
    })
    test(`${display.side}: glass blocks artwork placement through the display window`, () => {
      const hit = galleryPlacement.findPlacement([tunnel.x, floorY + 1.6, display.center[1]], [Math.sign(display.frontX), 0, 0], 1, 1, [])
      expect(hit?.wallId).toBe(`oculus-tunnel-${display.side}`)
      expect(hit?.valid).toBe(false)
    })
    for (const fps of [30, 60, 120]) {
      for (const jump of [false, true]) {
        test(`${display.side}: the player cannot enter through the glass at ${fps} Hz, jump ${jump}`, () => {
          const world = new RAPIER.World({
            x: 0,
            y: -9.81,
            z: 0,
          })
          world.timestep = 1 / fps
          const wall = walls.find(value => value.id === `oculus-tunnel-${display.side}`)!
          const geometry = createArchitectureGeometry(wall)
          for (const collision of geometry.collision) {
            const wallRotation = new Quaternion
            wallRotation.setFromAxisAngle(new Vector3(0, 1, 0), wall.rotation)
            world.createCollider(RAPIER.ColliderDesc.trimesh(...collision).setTranslation(...wall.center).setRotation(wallRotation))
          }
          const floor = new SlopedBoxGeometry(tunnel.width, 0.24, tunnel.southZ - tunnel.northZ, tunnelSlope)
          floor.translate(tunnel.x, floorY - 0.12, display.center[1])
          world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(floor)))
          floor.dispose()
          const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(tunnel.x, floorY + 0.04, display.center[1]))
          const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
          const motor = new EgoMotor(RAPIER, world, body, collider)
          const facing = new Quaternion
          facing.setFromAxisAngle(new Vector3(0, 1, 0), -Math.sign(display.frontX) * Math.PI / 2)
          try {
            for (let i = 0; i < fps * 3; i++) {
              motor.step(world.timestep, {
                forward: true,
                sprint: true,
                jump: jump && i === fps,
              }, facing)
              world.step()
            }
            expect(Math.abs(body.translation().x)).toBeLessThan(tunnel.width / 2 - 0.25)
            expect(Math.abs(body.translation().x)).toBeGreaterThan(1)
            expect(insideGallery([body.translation().x, body.translation().y, body.translation().z])).toBe(true)
          } finally {
            motor.dispose()
            world.free()
            geometry.dispose()
          }
        })
      }
    }
  }
})

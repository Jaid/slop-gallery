import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {EgoMotor} from 'ego-player/motor'
import {Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {createArchitectureGeometry, wallFace} from '../../src/lib/gallery/architecture.ts'
import {glasswellBalcony} from '../../src/lib/gallery/glasswellBalcony.ts'
import {lowerGallery} from '../../src/lib/gallery/lowerGallery.ts'
import {tunnelDisplays, tunnelDisplayWindow} from '../../src/lib/gallery/tunnelDisplays.ts'
import {findPlacement, insideGallery, rooms, walls} from '../../src/lib/gallery/walls.ts'

await RAPIER.init()
const {tunnel, floorY} = lowerGallery
describe('widened tunnel with sealed display rooms', () => {
  test('both portals, floor bounds and balcony follow the wider tunnel, without adding visitable rooms', () => {
    expect(tunnel.width).toBe(4.2)
    for (const id of ['glasswell-south', 'undertone-north']) {
      expect(walls.find(wall => wall.id === id)!.holes![0]!.width).toBe(tunnel.width)
    }
    expect(glasswellBalcony.width).toBe(tunnel.width + 1)
    expect(tunnelDisplays).toHaveLength(2)
    expect(tunnelDisplays[0]!.center[0]).toBe(-tunnelDisplays[1]!.center[0])
    for (const display of tunnelDisplays) {
      expect(display.exhibits).toHaveLength(3)
      expect(insideGallery([display.center[0], floorY + 1.6, display.center[1]])).toBe(false)
      expect(insideGallery([Math.sign(display.frontX) * 1.8, floorY + 1.6, display.center[1]])).toBe(true)
      for (const exhibit of display.exhibits) {
        expect(Math.abs(exhibit.position[0] - display.center[0]) + 0.7).toBeLessThan(display.size[0] / 2)
        expect(Math.abs(exhibit.position[2] - display.center[1]) + 0.7).toBeLessThan(display.size[1] / 2)
      }
    }
    expect(new Set(tunnelDisplays.flatMap(display => display.exhibits.map(exhibit => exhibit.kind))).size).toBe(6)
    expect(rooms).toHaveLength(7)
  })
  for (const display of tunnelDisplays) {
    test(`${display.side}: windows are real openings with glass collision, solid sills and a sealed room shell`, () => {
      const wall = walls.find(value => value.id === `glasswell-tunnel-${display.side}`)!
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
        for (const u of [-6.8, -4.5, 0, 4.5, 6.8]) {
          for (const y of [0.6, 1.62, 2.8]) {
            for (const side of [-1, 1]) {
              const origin = new Vector3(u, y, side)
              const direction = new Vector3(0, 0, -side)
              const ray = new Raycaster(origin, direction, 0, 2)
              expect(ray.intersectObjects(opaque)).toHaveLength(0)
              const hit = ray.intersectObjects(glass)[0]!
              expect(hit.point.z).toBeCloseTo((wallFace + side * tunnelDisplayWindow.glassThickness) / 2, 6)
              expect(world.castRay(new RAPIER.Ray(origin, direction), 2, true)!.timeOfImpact).toBeCloseTo(hit.distance, 6)
            }
          }
        }
        for (const [u, y] of [[0, 0.3], [0, 3], [-7.2, 1.6], [7.2, 1.6]]) {
          expect(new Raycaster(new Vector3(u, y, 1), new Vector3(0, 0, -1), 0, 2).intersectObjects(opaque).length).toBeGreaterThan(0)
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
          shell.createCollider(RAPIER.ColliderDesc.cuboid(box.size[0] / 2, box.size[1] / 2, box.size[2] / 2).setTranslation(...box.position))
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
      const hit = findPlacement([tunnel.x, floorY + 1.6, display.center[1]], [Math.sign(display.frontX), 0, 0], 1, 1, [])
      expect(hit?.wallId).toBe(`glasswell-tunnel-${display.side}`)
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
          const wall = walls.find(value => value.id === `glasswell-tunnel-${display.side}`)!
          const geometry = createArchitectureGeometry(wall)
          for (const collision of geometry.collision) {
            world.createCollider(RAPIER.ColliderDesc.trimesh(...collision).setTranslation(...wall.center).setRotation((new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), wall.rotation)))
          }
          world.createCollider(RAPIER.ColliderDesc.cuboid(tunnel.width / 2, 0.12, 10).setTranslation(tunnel.x, floorY - 0.12, display.center[1]))
          const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(tunnel.x, floorY + 0.04, display.center[1]))
          const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
          const motor = new EgoMotor(RAPIER, world, body, collider)
          const facing = (new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), -Math.sign(display.frontX) * Math.PI / 2)
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

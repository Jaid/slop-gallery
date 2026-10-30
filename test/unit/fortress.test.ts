import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import EgoMotor from 'ego-player/motor'
import {Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {fortressApproach, fortressCurve, fortressDoorway, fortressMouth, fortressOrigin, fortressPassages, fortressTransition} from '../../src/lib/gallery/fortress.ts'
import lodge from '../../src/lib/gallery/lodge.ts'
import oculusApse, {apseArcs, insideApse} from '../../src/lib/gallery/oculusApse.ts'
import OculusGroundGeometry from '../../src/lib/gallery/OculusGroundGeometry.ts'
import tower from '../../src/lib/gallery/oculusTower.ts'
import PassageRoute from '../../src/lib/gallery/passages/PassageRoute.ts'
import RouteVaultGeometry from '../../src/lib/gallery/passages/RouteVaultGeometry.ts'
import VaultGeometry from '../../src/lib/gallery/passages/VaultGeometry.ts'
import walls, {floorHeight, insideGallery, roomAt} from './fixtures/gallery.ts'
import {addOculusRailings} from './helpers/oculusRailings.ts'

await RAPIER.init()
const {route} = fortressCurve
const curve = new RouteVaultGeometry(fortressCurve)
const vaults = [new VaultGeometry(fortressMouth), curve, new VaultGeometry(fortressApproach, fortressTransition.length)]
const ground = new OculusGroundGeometry
const architecture = walls.filter(wall => wall.room === 'fortress' || wall.id === 'oculus-east').map(wall => ({
  wall,
  geometry: createArchitectureGeometry(wall),
}))
afterAll(() => {
  for (const vault of vaults) {
    vault.dispose()
  }
  ground.dispose()
  for (const {geometry} of architecture) {
    geometry.dispose()
  }
})
/** stations every half meter along the curve’s center line */
const stations = Array.from({length: Math.floor(route.length / 0.5) + 1}, (_, i) => route.at(i * 0.5))
describe('the Fortress’ route round the Oculus', () => {
  test('its three passages join end to end, from the doorway at the east bridge to the Lodge’s east wall', () => {
    expect(fortressMouth.path[0]).toEqual([fortressDoorway.x, fortressDoorway.z])
    expect(route.start).toEqual(fortressMouth.path.at(-1)!)
    expect(route.end.point[0]).toBeCloseTo(fortressApproach.path[0][0], 9)
    expect(route.end.point[1]).toBeCloseTo(fortressApproach.path[0][1], 9)
    expect(route.end.heading).toBeCloseTo(-Math.PI, 9)
    expect(fortressApproach.path.at(-1)).toEqual([lodge.center[0] + lodge.size[0] / 2, lodge.tunnelZ])
    // From the deck’s height at the doorway down to the Lodge’s floor
    expect(fortressMouth.floorY).toBe(tower.floorY + tower.height)
    expect(route.y).toBe(fortressMouth.floorY)
    expect(route.end.y).toBe(lodge.floorY)
    expect(fortressApproach.floorY).toBe(lodge.floorY)
    for (const passage of fortressPassages) {
      expect(passage.width).toBe(4)
      expect(passage.height).toBe(3.1)
    }
  })
  test('its curve keeps 30 cm behind the apse’s walls, round both shoulders and the crown', () => {
    const arcs = apseArcs()
    for (const piece of route.pieces.slice(1, 4)) {
      expect(piece.kind).toBe('arc')
      if (piece.kind !== 'arc') {
        continue
      }
      const arc = arcs.find(({center}) => Math.hypot(center[0] - piece.center[0], center[1] - piece.center[1]) < 1e-9)!
      expect(arc).toBeDefined()
      expect(piece.radius - fortressCurve.width / 2 - arc.radius).toBeCloseTo(0.3, 9)
    }
    for (const {point: [x, z]} of stations) {
      expect(insideApse(x, z, fortressCurve.width / 2)).toBe(false)
    }
  })
  test('navigation follows its floor, which falls along the run north and stays level round the apse', () => {
    const run = route.pieces[0]
    for (const {point: [x, z], y} of stations) {
      expect(fortressCurve.floorAt(x, z)).toBeCloseTo(y, 6)
      const position: Vec3 = [x, y + 1.6, z]
      expect(insideGallery(position)).toBe(true)
      expect(floorHeight(position)).toBeCloseTo(y, 6)
      expect(roomAt(position)).toBe('fortress')
    }
    expect(route.at(run.length).y - route.at(0).y).toBeCloseTo(lodge.floorY - fortressMouth.floorY, 9)
    expect((route.at(run.length).y - route.at(0).y) / run.length).toBeGreaterThan(-0.08)
    for (const along of [run.length + 1, route.length / 2, route.length - 0.5]) {
      expect(route.at(along).y).toBe(lodge.floorY)
    }
  })
  test('beside the passage, behind its walls, lies neither the passage nor anything else', () => {
    for (const {point: [x, z], heading, y} of stations) {
      for (const side of [-1, 1]) {
        const beside: Vec3 = [x - Math.sin(heading) * side * (fortressCurve.width / 2 + 0.2), y + 1.6, z + Math.cos(heading) * side * (fortressCurve.width / 2 + 0.2)]
        expect(fortressCurve.floorAt(beside[0], beside[2])).toBeUndefined()
        expect(insideGallery(beside)).toBe(false)
      }
    }
  })
  test('the apse belongs to the Oculus and the passage round it to the Fortress, also in the corners of the apse’s box', () => {
    const over = -6 + 1.6
    for (const [x, z] of [[0, -37.7], [-7.8, -36.2], [7.8, -36.2], [8.6, -35.2], [-8.6, -35.2]] as const) {
      expect(insideApse(x, z, -0.105)).toBe(true)
      expect(roomAt([x, over, z])).toBe('oculus')
    }
    // Inside the passage, close to its inner wall, where the boxes of both rooms overlap
    const shoulder = oculusApse.arcs[2]
    for (const angle of [-0.2, -0.6, -1]) {
      const radius = shoulder.radius + 0.3 + 0.15
      const position: Vec3 = [shoulder.center[0] + Math.cos(angle) * radius, lodge.floorY + 1.6, shoulder.center[1] + Math.sin(angle) * radius]
      expect(roomAt(position)).toBe('fortress')
    }
  })
  test('its walls follow the route: raked along the run, curved round the turns, as long as the pieces at their sides', () => {
    expect(fortressCurve.walls).toHaveLength(route.pieces.length * 2)
    for (const [index, wall] of fortressCurve.walls.entries()) {
      const piece = route.pieces[Math.floor(index / 2)]
      expect(wall.id).toBe(`fortress-curve_wall_${index}`)
      expect(wall.sticky).toBe(false)
      if (piece.kind === 'line') {
        expect(wall.width).toBeCloseTo(piece.length, 9)
        expect(Math.abs(wall.slope!)).toBeCloseTo(Math.abs(piece.endY - piece.startY) / piece.length, 9)
        expect(wall.curveRadius).toBeUndefined()
        continue
      }
      expect(Math.abs(wall.curveRadius!)).toBeCloseTo(piece.radius + (index % 2 ? 1 : -1) * Math.sign(piece.sweep) * -fortressCurve.width / 2, 9)
      expect(wall.width).toBeCloseTo(Math.abs(wall.curveRadius! * piece.sweep), 9)
      expect(wall.slope).toBeUndefined()
    }
  })
  test('the vault closes the passage above a person and springs from behind its walls', () => {
    const material = new MeshBasicMaterial
    const shell = new Mesh(curve.shell, material)
    try {
      for (const [index, {point: [x, z], heading, y}] of stations.entries()) {
        if (index % 3 !== 1) {
          continue
        }
        const up = new Raycaster(new Vector3(x, y + 1.6, z), new Vector3(0, 1, 0))
        expect(up.intersectObject(shell)[0].point.y - y).toBeCloseTo(fortressCurve.height, 1)
        for (const side of [-1, 1]) {
          const direction = new Vector3(-Math.sin(heading) * side, 0, Math.cos(heading) * side)
          // Below the springing, nothing of the vault stands inside the walls’ faces.
          const low = new Raycaster(new Vector3(x, y + 0.6, z), direction, 0, fortressCurve.width / 2 - 0.105)
          expect(low.intersectObject(shell)).toHaveLength(0)
        }
      }
    } finally {
      material.dispose()
    }
  })
  test('rejects routes and passages that cannot be built', () => {
    expect(() => new PassageRoute([0, 0], 0, 0, [])).toThrow(RangeError)
    expect(() => new PassageRoute([0, 0], 0, 0, [{length: 0}])).toThrow(RangeError)
    expect(() => new PassageRoute([0, 0], 0, 0, [{
      radius: 2,
      angle: 0,
    }])).toThrow(RangeError)
    expect(() => new PassageRoute([0, Number.NaN], 0, 0, [{length: 1}])).toThrow(RangeError)
    const quarter = new PassageRoute([0, 0], 0, 0, [{length: 2}, {
      radius: 1,
      angle: Math.PI / 2,
    }])
    // A clockwise quarter turn from heading east ends heading south.
    expect(quarter.end.point[0]).toBeCloseTo(3, 9)
    expect(quarter.end.point[1]).toBeCloseTo(1, 9)
    expect(quarter.end.heading).toBeCloseTo(Math.PI / 2, 9)
  })
  for (const sprint of [false, true]) {
    for (const returning of [false, true]) {
      test(`a player walks from the east bridge through the doorway round the apse into the Lodge, sprint ${sprint}, returning ${returning}`, () => {
        const world = new RAPIER.World({
          x: 0,
          y: -9.81,
          z: 0,
        })
        const fps = 60
        world.timestep = 1 / fps
        for (const {wall, geometry} of architecture) {
          for (const args of geometry.collision) {
            const rotation = new Quaternion
            world.createCollider(RAPIER.ColliderDesc.trimesh(...args).setTranslation(...wall.center).setRotation(rotation.setFromAxisAngle(new Vector3(0, 1, 0), wall.rotation)))
          }
        }
        for (const geometry of [ground, curve.paving, ...vaults.flatMap(vault => [vault.shell, vault.ribs])]) {
          world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(geometry)))
        }
        for (const passage of [fortressMouth, fortressApproach]) {
          for (const {center: [x, z], size: [width, depth]} of passage.floors) {
            world.createCollider(RAPIER.ColliderDesc.cuboid(width / 2, 0.12, depth / 2).setTranslation(x, passage.floorY - 0.12, z))
          }
        }
        addOculusRailings(world)
        const deck = tower.floorY + tower.height
        // Through the doorway and round the mouth’s elbow, like a player, at a walk; it ends before the timber transition’s saddle.
        const [elbowX] = fortressMouth.path[1]
        const path: Array<readonly [x: number, z: number, careful?: boolean]> = [[tower.x + 5, tower.z], [fortressDoorway.x + 0.6, tower.z, true], [elbowX, tower.z, true], [elbowX, route.start[1], true], ...stations.filter((_, i) => i % 2 === 0).map(({point}) => point), [-16.5, lodge.tunnelZ]]
        if (returning) {
          path.reverse()
        }
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(path[0][0], (returning ? lodge.floorY : deck) + 0.04, path[0][1]))
        const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
        const motor = new EgoMotor(RAPIER, world, body, collider)
        const facing = new Quaternion
        try {
          let target = 1
          for (let i = 0; i < fps * 60 && target < path.length; i++) {
            const position = body.translation()
            const dx = path[target][0] - position.x
            const dz = path[target][1] - position.z
            if (Math.hypot(dx, dz) < Math.max(0.3, (sprint ? 8 : 3) / fps)) {
              target++
              continue
            }
            facing.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(-dx, -dz))
            motor.step(world.timestep, {
              forward: true,
              sprint: sprint && !path[target][2],
            }, facing)
            world.step()
          }
          expect({
            target,
            position: body.translation(),
          }).toMatchObject({target: path.length})
          for (let i = 0; i < fps; i++) {
            motor.step(world.timestep, {}, facing)
            world.step()
          }
          expect(body.translation().y).toBeCloseTo((returning ? deck : lodge.floorY) + 0.02, 2)
          expect(motor.grounded).toBe(true)
        } finally {
          motor.dispose()
          world.free()
        }
      })
    }
  }
  test('its origin lies on its floor in the middle of the crown', () => {
    expect(fortressOrigin[0]).toBeCloseTo(tower.x, 9)
    expect(fortressOrigin[1]).toBe(lodge.floorY)
    expect(fortressOrigin[2]).toBeCloseTo(oculusApse.northZ - oculusApse.depth - 0.3 - fortressCurve.width / 2, 9)
  })
})

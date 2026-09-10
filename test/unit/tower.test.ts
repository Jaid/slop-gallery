import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {EgoMotor} from 'ego-player/motor'
import {Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry} from '../../src/lib/gallery/architecture.ts'
import {lowerGallery, oculusRamps} from '../../src/lib/gallery/lowerGallery.ts'
import {OculusGroundGeometry} from '../../src/lib/gallery/OculusGroundGeometry.ts'
import {towerRamp as ramp, oculusTower as tower, towerArch, towerFloorHeight, towerPlatformOutline, towerRampGradient, towerRampHalfWidth, towerRampHeight} from '../../src/lib/gallery/oculusTower.ts'
import {floorHeight} from '../../src/lib/gallery/walls.ts'
import {addOculusRailings} from './helpers/oculusRailings.ts'

await RAPIER.init()
const geometry = new OculusGroundGeometry
const collision = colliderGeometry(geometry)
function createWorld() {
  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  world.createCollider(RAPIER.ColliderDesc.trimesh(...collision))
  world.createCollider(RAPIER.ColliderDesc.cuboid(lowerGallery.oculus.size[0] / 2, 0.12, lowerGallery.oculus.size[1] / 2).setTranslation(lowerGallery.oculus.center[0], tower.floorY - 0.12, lowerGallery.oculus.center[1]))
  addOculusRailings(world)
  return world
}
describe('cylindrical Oculus platform', () => {
  test('both base corners are rounded with matching visible, collision and navigation surfaces', () => {
    const radius = ramp.baseCornerRadius
    expect(towerRampHalfWidth(ramp.startZ)).toBe(ramp.width / 2 + radius)
    expect(towerRampHalfWidth(ramp.startZ + radius)).toBeCloseTo(ramp.width / 2)
    expect(towerRampHalfWidth(ramp.endZ)).toBeCloseTo(ramp.width / 2)
    const material = new MeshBasicMaterial
    const mesh = new Mesh(geometry, material)
    const world = createWorld()
    try {
      world.step()
      for (const side of [-1, 1]) {
        for (const fraction of [0.13, 0.37, 0.61, 0.89]) {
          const theta = fraction * Math.PI / 2
          const z = ramp.startZ + radius * (1 - Math.cos(theta))
          const edge = ramp.width / 2 + radius * (1 - Math.sin(theta))
          expect(towerRampHalfWidth(z)).toBeCloseTo(edge, 6)
          for (const inset of [-0.02, 0.02]) {
            const x = tower.x + side * (edge - inset)
            const ray = new Raycaster(new Vector3(x, -2, z), new Vector3(0, -1, 0), 0, 4)
            const hit = ray.intersectObject(mesh)[0]
            const physical = world.castRay(new RAPIER.Ray(ray.ray.origin, ray.ray.direction), 4, true)
            expect(!!hit).toBe(inset > 0)
            expect(physical !== null).toBe(inset > 0)
            const top = towerFloorHeight(x, z)
            if (inset > 0) {
              expect(top).toBeDefined()
              expect(hit.point.y).toBeCloseTo(top!, 4)
              expect(-2 - physical!.timeOfImpact).toBeCloseTo(top!, 4)
            } else {
              expect(top).toBeUndefined()
            }
          }
        }
      }
    } finally {
      world.free()
      material.dispose()
    }
  })
  test('the ramp eases to horizontal at both ends without changing either elevation', () => {
    expect(towerRampHeight(0)).toBe(ramp.startY)
    expect(towerRampHeight(1)).toBe(ramp.endY)
    expect(towerRampGradient(0)).toBe(0)
    expect(towerRampGradient(1)).toBe(0)
    for (let i = 1; i <= ramp.segments; i++) {
      expect(towerRampHeight(i / ramp.segments)).toBeGreaterThan(towerRampHeight((i - 1) / ramp.segments))
      expect(towerRampGradient(i / ramp.segments)).toBeLessThan(Math.tan(35 * Math.PI / 180))
    }
    const lastRise = towerRampHeight(1) - towerRampHeight(1 - 1 / ramp.segments)
    expect(lastRise).toBeLessThan(0.002)
  })
  test('rounded shoulders blend the neck into the circular platform symmetrically', () => {
    expect(towerPlatformOutline.length).toBeGreaterThan(100)
    const neckZ = ramp.endZ - tower.z
    expect(towerPlatformOutline[0]).toEqual([-ramp.width / 2, neckZ])
    expect(towerPlatformOutline[1]).toEqual([ramp.width / 2, neckZ])
    for (const x of [-0.95, 0.95]) {
      expect(towerFloorHeight(x, tower.z - 1.2)).toBe(ramp.endY)
      expect(towerFloorHeight(x, ramp.endZ + 0.02)).toBeUndefined()
    }
  })
  test('the merged lower slopes meet the high base without gaps or raised overlays', () => {
    const material = new MeshBasicMaterial
    const mesh = new Mesh(geometry, material)
    try {
      for (const slope of oculusRamps) {
        for (const z of [slope.startZ - 0.01, -20, -25.99, -26.01]) {
          const hits = new Raycaster(new Vector3(slope.x, -2, z), new Vector3(0, -1, 0)).intersectObject(mesh)
          expect(hits).toHaveLength(1)
          const expected = z < slope.startZ - slope.run ? slope.floorY + slope.rise : slope.floorY + (slope.startZ - z) / slope.run * slope.rise
          expect(hits[0].point.y).toBeCloseTo(expected, 5)
        }
      }
    } finally {
      material.dispose()
    }
  })
  test('the merged landing and tower have one flush surface rather than stacked plates', () => {
    expect(ramp.endY).toBe(tower.floorY + tower.height)
    const material = new MeshBasicMaterial
    const mesh = new Mesh(geometry, material)
    try {
      for (const z of [-21.55, -21.3, -21.01, -20.8, -20.13]) {
        const hits = new Raycaster(new Vector3(0.37, -2, z), new Vector3(0, -1, 0)).intersectObject(mesh)
        expect(hits).toHaveLength(1)
        expect(hits[0].point.y).toBeCloseTo(ramp.endY, 5)
      }
    } finally {
      material.dispose()
    }
  })
  test('the support is solid down to the ground except for its real arched passage', () => {
    const world = createWorld()
    try {
      world.step()
      for (const offset of [-0.6, 0, 0.6]) {
        const origin = new Vector3(-2, tower.floorY + 1.7, towerArch.z + offset)
        expect(world.castRay(new RAPIER.Ray(origin, new Vector3(1, 0, 0)), 4, true)).toBeNull()
      }
      for (const [y, z] of [[tower.floorY + towerArch.height + 0.1, towerArch.z], [tower.floorY + 1, towerArch.z - towerArch.width / 2 - 0.1], [tower.floorY + 1, towerArch.z + towerArch.width / 2 + 0.1]]) {
        expect(world.castRay(new RAPIER.Ray(new Vector3(-2, y, z), new Vector3(1, 0, 0)), 4, true)).not.toBeNull()
      }
    } finally {
      world.free()
    }
  })
  test('the underpass ends at the circular tower’s rear edge without moving the lower jamb', () => {
    expect(towerArch.z - towerArch.width / 2).toBeCloseTo(-25.25)
    expect(towerArch.z + towerArch.width / 2).toBeCloseTo(tower.z - tower.radius)
    expect(towerArch.width).toBeCloseTo(3.05)
  })
  test('the underpass has a tall tower-side jamb, a sloping roof and tangent rounded corners', () => {
    const half = towerArch.width / 2
    const slope = (towerArch.height - towerArch.lowHeight) / towerArch.width
    const radius = towerArch.cornerRadius
    const cx = half - radius
    const cy = towerArch.lowHeight + slope * radius - radius * Math.hypot(1, slope)
    const tangentAngle = Math.atan2(1, slope)
    const highRadius = towerArch.highCornerRadius
    const highCx = -half + highRadius
    const highCy = towerArch.height - slope * highRadius - highRadius * Math.hypot(1, slope)
    const points = [
      [0, towerArch.height - slope * half],
      ...[0.05, 0.3, 0.6, 0.85, 0.97].map(fraction => {
        const angle = tangentAngle + (Math.PI - tangentAngle) * fraction
        return [highCx + highRadius * Math.cos(angle), highCy + highRadius * Math.sin(angle)]
      }),
      ...[0.15, 0.4, 0.7, 0.95].map(fraction => {
        const angle = tangentAngle * fraction
        return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]
      }),
    ]
    const material = new MeshBasicMaterial
    const mesh = new Mesh(geometry, material)
    const world = createWorld()
    try {
      world.step()
      expect(towerArch.height - towerArch.lowHeight).toBeGreaterThan(0.7)
      for (const [u, height] of points as Array<[number, number]>) {
        const z = towerArch.z - u
        const origin = new Vector3(tower.x, tower.floorY + 0.5, z)
        const direction = new Vector3(0, 1, 0)
        const visible = new Raycaster(origin, direction).intersectObject(mesh)[0]
        const physical = world.castRay(new RAPIER.Ray(origin, direction), 5, true)!
        expect(visible.point.y).toBeCloseTo(tower.floorY + height, 3)
        expect(origin.y + physical.timeOfImpact).toBeCloseTo(visible.point.y, 4)
        // The original walkable ramp stays intact, with substantial stone above the tunnel.
        expect(towerRampHeight((z - ramp.startZ) / (ramp.endZ - ramp.startZ)) - visible.point.y).toBeGreaterThan(0.5)
        for (const side of [-1, 1]) {
          for (const delta of [-0.025, 0.025]) {
            const ray = new Raycaster(new Vector3(tower.x + side * 2, tower.floorY + height + delta, z), new Vector3(-side, 0, 0), 0, 4)
            expect(ray.intersectObject(mesh).length > 0).toBe(delta > 0)
            expect(world.castRay(new RAPIER.Ray(ray.ray.origin, ray.ray.direction), 4, true) !== null).toBe(delta > 0)
          }
        }
      }
      for (const side of [-1, 1]) {
        for (const inset of [-0.02, 0.02]) {
          const z = towerArch.z + side * (half - inset)
          const ray = new Raycaster(new Vector3(tower.x - 2, tower.floorY + 1, z), new Vector3(1, 0, 0), 0, 4)
          expect(ray.intersectObject(mesh).length > 0).toBe(inset < 0)
          expect(world.castRay(new RAPIER.Ray(ray.ray.origin, ray.ray.direction), 4, true) !== null).toBe(inset < 0)
        }
      }
    } finally {
      world.free()
      material.dispose()
    }
  })
  for (const fps of [30, 60, 120]) {
    for (const offset of [-towerArch.width / 2 + 0.4, -0.4, 0, 0.4, towerArch.width / 2 - 0.4]) {
      for (const returning of [false, true]) {
        test(`walks through the arch at ${fps} Hz, offset ${offset}, returning ${returning}`, () => {
          const world = createWorld()
          world.timestep = 1 / fps
          const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(returning ? 2 : -2, tower.floorY + 0.04, towerArch.z + offset))
          const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
          const motor = new EgoMotor(RAPIER, world, body, collider)
          const facing = (new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), returning ? Math.PI / 2 : -Math.PI / 2)
          try {
            for (let i = 0; i < fps * 2; i++) {
              motor.step(world.timestep, {forward: true}, facing)
              world.step()
              if (returning ? body.translation().x < -2 : body.translation().x > 2) {
                break
              }
            }
            expect(returning ? body.translation().x < -2 : body.translation().x > 2).toBe(true)
            for (let i = 0; i < fps / 2; i++) {
              motor.step(world.timestep, {}, facing)
              world.step()
            }
            expect(body.translation().y).toBeCloseTo(tower.floorY + 0.02, 2)
          } finally {
            motor.dispose()
            world.free()
          }
        })
      }
    }
  }
  test('the tower leaves tunnel clearance and headroom below the unchanged glass', () => {
    expect(tower.height).toBe(4.5)
    expect(tower.radius).toBe(2.2)
    expect(tower.z + tower.radius).toBeLessThan(lowerGallery.tunnel.northZ - 3.5)
    expect(tower.floorY + tower.height + 1.8).toBeLessThan(-0.12)
    expect(floorHeight([tower.x, tower.floorY + tower.height + 1.6, tower.z])).toBe(-3.5)
    expect(floorHeight([tower.x, 1.6, tower.z])).toBe(0)
    expect(towerFloorHeight(tower.x + tower.radius + 0.01, tower.z)).toBeUndefined()
    expect(floorHeight([tower.x, -6.4, (ramp.startZ + ramp.endZ) / 2])).toBe(-8)
  })
  test('the visible deck and cylindrical top match collision and navigation heights', () => {
    const material = new MeshBasicMaterial
    const meshes = [new Mesh(geometry, material)]
    for (const mesh of meshes) {
      mesh.updateMatrixWorld(true)
    }
    const world = createWorld()
    try {
      world.step()
      for (const x of [-0.35, 0, 0.35]) {
        for (const z of [ramp.startZ + 0.3, -24, ramp.endZ - 0.1, ramp.endZ + 0.1, tower.z]) {
          const origin = new Vector3(x, -2, z)
          const direction = new Vector3(0, -1, 0)
          const height = towerFloorHeight(x, z)!
          expect(new Raycaster(origin, direction).intersectObjects(meshes)[0].point.y).toBeCloseTo(height, 5)
          expect(world.castRay(new RAPIER.Ray(origin, direction), 10, true)!.timeOfImpact).toBeCloseTo(origin.y - height, 4)
        }
      }
    } finally {
      world.free()
      material.dispose()
    }
  })
  for (const fps of [30, 60, 120, 240]) {
    for (const offset of [-0.35, 0, 0.35]) {
      for (const sprint of [false, true]) {
        for (const ascending of [false, true]) {
          test(`${ascending ? 'ascends' : 'descends'} the connecting ramp at ${fps} Hz, offset ${offset}, sprint ${sprint}`, () => {
            const world = createWorld()
            world.timestep = 1 / fps
            const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(tower.x + offset, (ascending ? ramp.startY : tower.floorY + tower.height) + 0.04, ascending ? ramp.startZ - 0.7 : tower.z))
            const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
            const motor = new EgoMotor(RAPIER, world, body, collider)
            const facing = (new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), ascending ? Math.PI : 0)
            try {
              // Brake on entry to the small top; sprint momentum must not carry the player off its far edge.
              let reached = false
              for (let i = 0; i < fps * 6; i++) {
                motor.step(world.timestep, {
                  forward: true,
                  sprint,
                }, facing)
                world.step()
                reached = ascending ? body.translation().z > tower.z - 0.85 : body.translation().z < ramp.startZ - 0.5
                if (reached) {
                  break
                }
              }
              expect(reached).toBe(true)
              for (let i = 0; i < fps; i++) {
                motor.step(world.timestep, {}, facing)
                world.step()
              }
              expect(body.translation().y).toBeCloseTo((ascending ? tower.floorY + tower.height : ramp.startY) + 0.02, 2)
              expect(motor.grounded).toBe(true)
            } finally {
              motor.dispose()
              world.free()
            }
          })
        }
      }
    }
  }
})

import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {Quaternion, Vector3} from 'three/webgpu'

import {ChandelierGeometry} from '../../src/lib/gallery/ChandelierGeometry.ts'
import {chandelierPhysics} from '../../src/lib/physics/chandelier.ts'

await RAPIER.init()
function simulate(mass: number, miss = false, fixture = chandelierPhysics) {
  const geometry = new ChandelierGeometry
  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  world.timestep = 1 / 120
  const anchor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, fixture.height + fixture.anchor[1], 0))
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, fixture.height, 0).setAngularDamping(fixture.angularDamping).setLinearDamping(fixture.linearDamping).setCcdEnabled(true).setCanSleep(false).setAdditionalSolverIterations(8))
  world.createCollider(RAPIER.ColliderDesc.ball(0.21).setMass(fixture.hubMass), body)
  world.createCollider(RAPIER.ColliderDesc.ball(0.12).setTranslation(0, -0.38, 0).setMass(fixture.pendantMass), body)
  world.createCollider(RAPIER.ColliderDesc.cylinder((fixture.anchor[1] - 0.05) / 2, 0.022).setTranslation(0, (fixture.anchor[1] + 0.15) / 2, 0).setMass(fixture.stemMass), body)
  for (const vertices of geometry.armColliders) {
    world.createCollider(RAPIER.ColliderDesc.convexHull(vertices)!.setMass(fixture.armMass).setRestitution(0.15), body)
  }
  for (const vertices of geometry.ringColliders) {
    world.createCollider(RAPIER.ColliderDesc.convexHull(vertices)!.setMass(fixture.ringMass).setRestitution(0.15), body)
  }
  world.createImpulseJoint(RAPIER.JointData.spherical(new Vector3, new Vector3(...fixture.anchor)), anchor, body, true)
  const offset = () => Math.hypot(body.translation().x, body.translation().z)
  try {
    for (let i = 0; i < 120; i++) {
      world.step()
    }
    expect(offset()).toBeLessThan(0.001)
    const projectile = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(miss ? 3 : 1.25, fixture.height + 0.27, 2.5).setLinvel(0, 0, -10).setGravityScale(0).setCcdEnabled(true))
    world.createCollider(RAPIER.ColliderDesc.ball(0.23).setMass(mass), projectile)
    let peak = 0
    let drift = 0
    for (let i = 0; i < 120 * 8; i++) {
      world.step()
      peak = Math.max(peak, offset())
      const q = body.rotation()
      const p = body.translation()
      const pin = new Vector3(...fixture.anchor).applyQuaternion(new Quaternion(q.x, q.y, q.z, q.w)).add(new Vector3(p.x, p.y, p.z))
      drift = Math.max(drift, pin.distanceTo(new Vector3(0, fixture.height + fixture.anchor[1], 0)))
    }
    expect(drift).toBeLessThan(0.012)
    for (let i = 0; i < 120 * 45; i++) {
      world.step()
    }
    expect(offset()).toBeLessThan(0.015)
    return peak
  } finally {
    world.free()
    geometry.dispose()
  }
}
describe('suspended Amber chandelier', () => {
  test('a thrown sculpture swings it, a heavier pot swings it farther and damping settles it', () => {
    const light = simulate(1.8)
    const heavy = simulate(5)
    expect(light).toBeGreaterThan(0.12)
    expect(heavy).toBeGreaterThan(light * 1.2)
    const previous = simulate(5, false, {
      height: 4.05,
      anchor: [0, 1.55, 0],
      angularDamping: 0.65,
      linearDamping: 0.15,
      armMass: 0.4,
      hubMass: 2,
      stemMass: 0.35,
      ringMass: 0.025,
      pendantMass: 0.1,
    })
    expect(heavy).toBeGreaterThan(previous * 1.15)
  })
  test('a miss does not trigger a canned swing', () => {
    expect(simulate(5, true)).toBeLessThan(0.001)
  })
})

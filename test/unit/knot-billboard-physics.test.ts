import {expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {knotBillboardPhysics} from 'knot-materials/knotBillboardPhysics.ts'
import {knotPreviewHeight, knotPreviewMountY, knotPreviewPanelOffsetY, knotPreviewWidth} from 'knot-materials/KnotPreviewLayout.ts'
import {billboardParts} from 'knot-materials/signs.ts'
import {Euler, Quaternion} from 'three/webgpu'

await RAPIER.init()
function relativeHingeAngle(stand: RAPIER.RigidBody, sign: RAPIER.RigidBody) {
  const standRotation = stand.rotation()
  const signRotation = sign.rotation()
  const relative = new Quaternion(standRotation.x, standRotation.y, standRotation.z, standRotation.w)
  const signQuaternion = new Quaternion(signRotation.x, signRotation.y, signRotation.z, signRotation.w)
  relative.invert().multiply(signQuaternion)
  const euler = new Euler
  return euler.setFromQuaternion(relative, 'XYZ').x
}
test('billboard stand scoots and sign flexes under impact, then both return', () => {
  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  world.timestep = 1 / 120
  try {
    const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.12, 0))
    world.createCollider(RAPIER.ColliderDesc.cuboid(20, 0.12, 20), floor)
    const anchor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, knotPreviewMountY, 0))
    const stand = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, knotPreviewMountY, 0)
      .enabledTranslations(true, false, true)
      .lockRotations()
      .setCanSleep(false)
      .setCcdEnabled(true)
      .setLinearDamping(knotBillboardPhysics.stand.linearDamping)
      .setAdditionalSolverIterations(knotBillboardPhysics.solverIterations))
    const sign = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, knotPreviewMountY + knotPreviewPanelOffsetY, 0)
      .setCanSleep(false)
      .setCcdEnabled(true)
      .setAngularDamping(knotBillboardPhysics.sign.angularDamping)
      .setLinearDamping(knotBillboardPhysics.sign.linearDamping)
      .setAdditionalSolverIterations(knotBillboardPhysics.solverIterations))
    const [panel, ...standParts] = billboardParts(knotPreviewWidth, knotPreviewHeight, knotPreviewPanelOffsetY)
    for (const part of standParts) {
      const rotation = new Quaternion
      rotation.setFromEuler(new Euler(...part.rotation ?? [0, 0, 0]))
      world.createCollider(RAPIER.ColliderDesc.cuboid(part.size[0] / 2, part.size[1] / 2, part.size[2] / 2)
        .setTranslation(...part.position)
        .setRotation(rotation)
        .setMass(knotBillboardPhysics.stand.colliderMass)
        .setFriction(knotBillboardPhysics.stand.friction), stand)
    }
    world.createCollider(RAPIER.ColliderDesc.cuboid(panel.size[0] / 2, panel.size[1] / 2, panel.size[2] / 2)
      .setTranslation(0, 0, panel.position[2])
      .setMass(knotBillboardPhysics.sign.mass), sign)
    world.createImpulseJoint(RAPIER.JointData.spring(
      0,
      knotBillboardPhysics.stand.springStiffness,
      knotBillboardPhysics.stand.springDamping,
      {
        x: 0,
        y: 0,
        z: 0,
      },
      {
        x: 0,
        y: 0,
        z: 0,
      },
    ), anchor, stand, true)
    world.createImpulseJoint(RAPIER.JointData.rope(
      knotBillboardPhysics.stand.maxDisplacement,
      {
        x: 0,
        y: 0,
        z: 0,
      },
      {
        x: 0,
        y: 0,
        z: 0,
      },
    ), anchor, stand, true)
    const signJoint = world.createImpulseJoint(RAPIER.JointData.revolute(
      {
        x: 0,
        y: knotPreviewPanelOffsetY + knotPreviewHeight / 2,
        z: 0,
      },
      {
        x: 0,
        y: knotPreviewHeight / 2,
        z: 0,
      },
      {
        x: 1,
        y: 0,
        z: 0,
      },
    ), stand, sign, true)
    expect(signJoint).toBeInstanceOf(RAPIER.RevoluteImpulseJoint)
    if (!(signJoint instanceof RAPIER.RevoluteImpulseJoint)) {
      return
    }
    signJoint.setContactsEnabled(false)
    signJoint.setLimits(-knotBillboardPhysics.sign.hingeLimit, knotBillboardPhysics.sign.hingeLimit)
    signJoint.configureMotorPosition(0, knotBillboardPhysics.sign.motorStiffness, knotBillboardPhysics.sign.motorDamping)
    for (let index = 0; index < 240; index++) {
      world.step()
    }
    const projectile = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, knotPreviewMountY + knotPreviewPanelOffsetY, 2.5)
      .setLinvel(0, 0, -11)
      .setGravityScale(0)
      .setCcdEnabled(true))
    world.createCollider(RAPIER.ColliderDesc.ball(0.18).setMass(5), projectile)
    let standPeak = 0
    let signPeak = 0
    for (let index = 0; index < 1200; index++) {
      world.step()
      const translation = stand.translation()
      standPeak = Math.max(standPeak, Math.hypot(translation.x, translation.z))
      signPeak = Math.max(signPeak, Math.abs(relativeHingeAngle(stand, sign)))
    }
    expect(standPeak).toBeGreaterThan(0.02)
    expect(standPeak).toBeLessThanOrEqual(knotBillboardPhysics.stand.maxDisplacement + 0.002)
    expect(signPeak).toBeGreaterThan(0.015)
    expect(signPeak).toBeLessThanOrEqual(knotBillboardPhysics.sign.hingeLimit + 0.001)
    expect(Math.hypot(stand.translation().x, stand.translation().z)).toBeLessThan(0.001)
    expect(Math.abs(relativeHingeAngle(stand, sign))).toBeLessThan(0.01)
  } finally {
    world.free()
  }
})

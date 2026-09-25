import {expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {knots} from 'knot-materials'
import {knotExhibition, knotFloatHeight} from 'knot-materials/exhibition.ts'
import KnotResources from 'knot-materials/KnotResources.ts'
import {knotSign, knotSignParts, knotSignPosition, knotSignRoundParts} from 'knot-materials/signs.ts'
import {Euler, Quaternion} from 'three/webgpu'

import KnotRotation from '../../src/lib/physics/KnotRotation.ts'

await RAPIER.init()
const rotation = (value: [number, number, number]) => {
  const quaternion = new Quaternion
  return quaternion.setFromEuler(new Euler(...value))
}
test('showcase hull clears its own nameplate through a full revolution at maximum displacement', () => {
  const maximum = knots.reduce((best, knot) => ((knot.displacement ?? 0) > (best.displacement ?? 0) ? knot : best))
  const displacement = maximum.displacement ?? 0
  const resources = new KnotResources([maximum])
  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  const events = new RAPIER.EventQueue(true)
  try {
    const exhibit = knotExhibition[0]
    const knot = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(exhibit.position[0], knotFloatHeight, exhibit.position[2]))
    world.createCollider(
      RAPIER.ColliderDesc.convexHull(resources.items[0].colliderVertices)!
        .setContactSkin(displacement)
        .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS),
      knot,
    )
    const signHome = knotSignPosition(exhibit)
    const sign = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(...signHome)
        .setRotation(rotation([0, exhibit.rotation + knotSign.inwardRotation, 0])),
    )
    for (const part of knotSignParts) {
      const collider = RAPIER.ColliderDesc.cuboid(part.size[0] / 2, part.size[1] / 2, part.size[2] / 2)
        .setMass(knotSign.plateMass)
        .setTranslation(...part.position)
      if (part.rotation) {
        collider.setRotation(rotation(part.rotation))
      }
      world.createCollider(collider, sign)
    }
    for (const part of knotSignRoundParts) {
      const collider = RAPIER.ColliderDesc.cylinder(part.height / 2, part.radius)
        .setMass(part.mass)
        .setTranslation(...part.position)
      if (part.rotation) {
        collider.setRotation(rotation(part.rotation))
      }
      world.createCollider(collider, sign)
    }
    world.createCollider(RAPIER.ColliderDesc.cuboid(20, 0.1, 20).setTranslation(0, -0.1, 0))
    const showcase = new KnotRotation
    let maximumContactForce = 0
    for (let frame = 0; frame < 40 * 60; frame++) {
      showcase.step(knot, 1 / 60)
      world.step(events)
      events.drainContactForceEvents(event => {
        maximumContactForce = Math.max(maximumContactForce, event.totalForceMagnitude())
      })
    }
    const signPosition = sign.translation()
    expect(maximumContactForce).toBe(0)
    expect(showcase.isShowcased(knot)).toBe(true)
    expect(Math.hypot(signPosition.x - signHome[0], signPosition.y - signHome[1], signPosition.z - signHome[2])).toBeLessThan(0.001)
  } finally {
    events.free()
    world.free()
    resources.dispose()
  }
})

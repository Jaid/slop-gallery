import {expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {Quaternion, Vector3} from 'three/webgpu'

import drawFace, {modelSignTextureSize} from '../../src/components/levels/knottingham/KnotModelSign/drawFace.ts'
import {knotGalleryBounds} from '../../src/lib/gallery/knotGallery.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import KnotModelSignGeometry from '../../src/lib/knots/KnotModelSignGeometry.ts'
import {knotModelSign, modelSignSuspensionCenter, modelSignSuspensionHeight} from '../../src/lib/physics/knotModelSign.ts'

await RAPIER.init()
function simulate(mass: number, miss = false, yaw = 0) {
  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  world.timestep = 1 / 120
  const rotation = (new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), yaw)
  const elevation = knotGalleryBounds.height - knotModelSign.ceilingInset - knotModelSign.anchor[1]
  const pivot = new Vector3(0, elevation + knotModelSign.anchor[1], 0)
  const anchor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(pivot.x, pivot.y, pivot.z).setRotation(rotation))
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, elevation, 0).setRotation(rotation).setCcdEnabled(true).setCanSleep(false).setAngularDamping(knotModelSign.angularDamping).setLinearDamping(knotModelSign.linearDamping).setAdditionalSolverIterations(8))
  world.createCollider(RAPIER.ColliderDesc.cuboid(knotModelSign.size[0] / 2, knotModelSign.size[1] / 2, knotModelSign.size[2] / 2).setMass(knotModelSign.mass).setRestitution(0.15), body)
  for (const x of knotModelSign.suspensionX) {
    world.createCollider(RAPIER.ColliderDesc.cylinder(modelSignSuspensionHeight / 2, 0.014).setTranslation(x, modelSignSuspensionCenter, 0).setMass(knotModelSign.suspensionMass), body)
  }
  const joint = world.createImpulseJoint(RAPIER.JointData.revolute(new Vector3, new Vector3(...knotModelSign.anchor), new Vector3(...knotModelSign.axis)), anchor, body, true)
  expect(joint).toBeInstanceOf(RAPIER.RevoluteImpulseJoint)
  if (joint instanceof RAPIER.RevoluteImpulseJoint) {
    joint.setLimits(...knotModelSign.limits)
  }
  const displacement = () => Math.hypot(body.translation().x, body.translation().z)
  try {
    for (let i = 0; i < 360; i++) {
      world.step()
    }
    expect(displacement()).toBeLessThan(0.001)
    const origin = new Vector3(miss ? 3 : 0.6, elevation, 2).applyQuaternion(rotation)
    const velocity = new Vector3(0, 0, -12).applyQuaternion(rotation)
    const projectile = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(origin.x, origin.y, origin.z).setLinvel(velocity.x, velocity.y, velocity.z).setGravityScale(0).setCcdEnabled(true))
    world.createCollider(RAPIER.ColliderDesc.ball(0.18).setMass(mass), projectile)
    let peak = 0
    let drift = 0
    for (let i = 0; i < 960; i++) {
      world.step()
      peak = Math.max(peak, displacement())
      const q = body.rotation()
      const position = body.translation()
      const pin = new Vector3(...knotModelSign.anchor).applyQuaternion(new Quaternion(q.x, q.y, q.z, q.w)).add(new Vector3(position.x, position.y, position.z))
      drift = Math.max(drift, pin.distanceTo(pivot))
    }
    expect(drift).toBeLessThan(0.015)
    expect(peak).toBeLessThan(knotModelSign.anchor[1] * Math.sin(knotModelSign.limits[1]) + 0.03)
    world.removeRigidBody(projectile)
    for (let i = 0; i < 5400; i++) {
      world.step()
    }
    expect(displacement()).toBeLessThan(0.02)
    expect(new Vector3(body.linvel().x, body.linvel().y, body.linvel().z).length()).toBeLessThan(0.002)
    return peak
  } finally {
    world.free()
  }
}
test('ceiling-mounted signs swing after real impacts and settle without detaching', () => {
  const light = simulate(1.8)
  const heavy = simulate(5)
  expect(light).toBeGreaterThan(0.1)
  expect(heavy).toBeGreaterThan(light * 1.1)
  expect(simulate(1.8, false, Math.PI / 2)).toBeCloseTo(light, 2)
  expect(simulate(5, true)).toBeLessThan(0.001)
})
test('large physical signs have two ceiling mounts, bounded chain geometry and room above the billboards', () => {
  const geometry = new KnotModelSignGeometry
  try {
    const bottom = knotGalleryBounds.height - knotModelSign.ceilingInset - knotModelSign.anchor[1] - knotModelSign.size[1] / 2
    expect(bottom).toBeGreaterThan(1.5 + 2.75 / 2 + 0.5)
    expect(knotModelSign.suspensionX).toHaveLength(2)
    expect(geometry.panel.groups).toHaveLength(6)
    expect(triangleCount(geometry.chains)).toBeLessThan(6000)
    expect(geometry.canopy.boundingBox!.max.y + knotGalleryBounds.height - knotModelSign.ceilingInset - knotModelSign.anchor[1]).toBeGreaterThan(knotGalleryBounds.height - 0.09)
    for (const part of [geometry.panel, geometry.chains, geometry.canopy]) {
      expect([...part.getAttribute('position').array].every(Number.isFinite)).toBe(true)
    }
    let disposed = 0
    for (const part of [geometry.panel, geometry.chains, geometry.canopy]) {
      part.addEventListener('dispose', () => disposed++)
    }
    geometry.dispose()
    expect(disposed).toBe(3)
  } finally {
    geometry.dispose()
  }
})
test('printed faces contain a fitted model name and proportional icon, without exhibit numbers', () => {
  for (const withIcon of [true, false]) {
    const text: Array<Array<unknown>> = []
    const images: Array<Array<unknown>> = []
    const fonts: Array<string> = []
    const context = {
      set font(value: string) {
        fonts.push(value)
      },
      fillRect() {},
      strokeRect() {},
      fillText: (...args: Array<unknown>) => text.push(args),
      drawImage: (...args: Array<unknown>) => images.push(args),
      measureText: () => ({width: 3000}),
    } as unknown as CanvasRenderingContext2D
    const icon = {
      naturalWidth: 256,
      naturalHeight: 128,
    } as HTMLImageElement
    drawFace(context, 'A very long model name', withIcon ? icon : undefined)
    expect(text).toHaveLength(1)
    expect(text[0][0]).toBe('A very long model name')
    expect(text[0][2]).toBe(modelSignTextureSize[1] / 2)
    expect(Number.parseInt(fonts[1].split(' ')[1], 10)).toBeLessThan(190)
    expect(images).toHaveLength(withIcon ? 1 : 0)
    if (withIcon) {
      expect(images[0]).toEqual([icon, 90, (modelSignTextureSize[1] - 150) / 2, 300, 150])
    }
  }
})

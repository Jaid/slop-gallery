import type {BodyImpact} from '../../src/lib/physics/BodyImpacts.ts'

import {expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {Quaternion, Vector3} from 'three/webgpu'

import {frameContact, frameImpactSounds, frameImpactVoices} from '../../src/lib/audio/frameImpacts.ts'
import {orbImpactVoices} from '../../src/lib/audio/orbImpacts.ts'
import {frames} from '../../src/lib/frames/index.ts'
import BodyImpacts from '../../src/lib/physics/BodyImpacts.ts'

await RAPIER.init()
/** A world stepping like `<Physics>` of @react-three/rapier, with a floor 10 m square whose top lies at 0 and a wall along its east edge in one collider, like a room’s trimesh. */
function physics() {
  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  world.timestep = 1 / 60
  Object.assign(world.integrationParameters, {
    normalizedAllowedLinearError: 0.001,
    normalizedPredictionDistance: 0.002,
  })
  const room = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
  world.createCollider(RAPIER.ColliderDesc.cuboid(5, 0.1, 5).setTranslation(0, -0.1, 0), room)
  // The wall, a collider of its own on the same body.
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.1, 2, 5).setTranslation(5.1, 2, 0), room)
  const impacts: Array<BodyImpact<string>> = []
  const sampler = new BodyImpacts<string>(impact => impacts.push(impact))
  const step = (count: number) => {
    for (let i = 0; i < count; i++) {
      sampler.capture(world)
      world.step()
      sampler.collect(world)
    }
  }
  return {
    world,
    impacts,
    sampler,
    step,
  }
}
const radius = 0.14
/** an orb: a 0.14 m glass ball of 1.8 kg */
function orb(world: RAPIER.World, [x, y, z]: readonly [number, number, number]) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setCcdEnabled(true))
  world.createCollider(RAPIER.ColliderDesc.ball(radius).setMass(1.8).setFriction(0.8).setRestitution(0.32), body)
  return body
}
/** Sets an orb rolling along x at `speed` m/s, spinning as fast as it rolls. */
function roll(body: RAPIER.RigidBody, speed: number) {
  body.setLinvel({
    x: speed,
    y: 0,
    z: 0,
  }, true)
  body.setAngvel({
    x: 0,
    y: 0,
    z: -speed / radius,
  }, true)
}
test('an orb dropped onto the floor strikes it at the speed it fell with, then bounces ever softer until it rests silently', () => {
  const {world, impacts, sampler, step} = physics()
  const body = orb(world, [0, 1.3, 0])
  sampler.register(body, 'orb')
  step(240)
  expect(impacts.length).toBeGreaterThanOrEqual(2)
  const [first, second] = impacts
  // 1.16 m of fall
  expect(first.speed).toBeCloseTo(Math.sqrt(2 * 9.81 * 1.16), 0)
  expect(first.normal.y).toBeCloseTo(-1)
  expect(first.point.y).toBeCloseTo(0, 1)
  expect(first.other).toBeUndefined()
  expect(second.speed).toBeLessThan(first.speed * 0.3)
  const count = impacts.length
  step(120)
  expect(impacts).toHaveLength(count)
})
test('an orb rolling along the floor strikes the wall it meets, not the floor under it on the way', () => {
  const {world, impacts, sampler, step} = physics()
  const body = orb(world, [0, 0.14, 0])
  sampler.register(body, 'orb')
  step(30)
  impacts.length = 0
  roll(body, 4)
  step(150)
  expect(impacts.length).toBeGreaterThanOrEqual(1)
  const [wall] = impacts
  expect(wall.speed).toBeCloseTo(4, 0)
  expect(wall.point.x).toBeCloseTo(5, 1)
  expect(wall.point.y).toBeCloseTo(radius, 1)
  expect(wall.normal.x).toBeCloseTo(1)
})
test('two orbs striking each other sound once, and only registered bodies sound at all', () => {
  const {world, impacts, sampler, step} = physics()
  const left = orb(world, [-1, 0.14, 0])
  const right = orb(world, [1, 0.14, 0])
  const stranger = orb(world, [0, 0.14, 2])
  sampler.register(left, 'left')
  const unregister = sampler.register(right, 'right')
  step(30)
  impacts.length = 0
  roll(left, 3)
  roll(right, -3)
  stranger.setTranslation({
    x: 0,
    y: 1,
    z: 2,
  }, true)
  step(30)
  expect(impacts).toHaveLength(1)
  const [clink] = impacts
  expect(new Set([clink.tag, clink.other])).toEqual(new Set(['left', 'right']))
  expect(clink.point.y).toBeCloseTo(radius, 2)
  // Both closed in at 3 m/s.
  expect(clink.speed).toBeCloseTo(6, 0)
  unregister()
  impacts.length = 0
  right.setTranslation({
    x: 0,
    y: 1,
    z: -2,
  }, true)
  step(90)
  expect(impacts.every(impact => impact.tag === 'left')).toBe(true)
})
test('a work dropped askew strikes with a corner first and lands flat at last, while the points it keeps touching stay quiet', () => {
  const {world, impacts, sampler, step} = physics()
  // Lying on its back, but tipped over two of its sides, so one corner hangs lowest
  const sideways = new Quaternion
  sideways.setFromAxisAngle(new Vector3(0, 0, 1), 0.3)
  const tipped = new Quaternion
  tipped.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2 + 0.3).premultiply(sideways)
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0.6, 0).setRotation(tipped).setCcdEnabled(true))
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.35, 0.25, 0.03).setMass(2).setFriction(0.75).setRestitution(0.32), body)
  sampler.register(body, 'work')
  const contacts: Array<string> = []
  for (let i = 0; i < 240; i++) {
    const count = impacts.length
    step(1)
    if (impacts.length === count) {
      continue
    }
    const {normal, rotation} = impacts.at(-1)!
    const local = normal.clone().applyQuaternion(rotation.clone().invert())
    contacts.push(frameContact([local.x, local.y, local.z]))
  }
  expect(contacts[0]).toBe('corner')
  expect(contacts.at(-1)).toBe('flat')
  // It strikes a few times on its way down, not on every step it lies there.
  expect(contacts.length).toBeLessThan(8)
})
test('orbs sound louder and brighter the harder they strike, and like what they strike', () => {
  expect(orbImpactVoices('generic', 0.1)).toEqual([])
  const loudness = (speed: number) => orbImpactVoices('generic', speed).reduce((sum, voice) => sum + voice.volume, 0)
  expect(loudness(0.5)).toBeLessThan(loudness(3))
  expect(loudness(3)).toBeLessThan(loudness(10))
  const recipes = new Set((['generic', 'stone', 'hollow', 'fabric', 'glass', 'orb'] as const).map(surface => JSON.stringify(orbImpactVoices(surface, 4))))
  expect(recipes.size).toBe(6)
  // Flagstones are the hard ground with grit.
  expect(orbImpactVoices('stone', 4).slice(0, -1)).toEqual(orbImpactVoices('generic', 4))
  expect(orbImpactVoices('generic', 4, -1)).not.toEqual(orbImpactVoices('generic', 4, 1))
})
test('a work strikes with its face, a side or a corner, by the contact’s normal in its frame', () => {
  expect(frameContact([0, 0, 1])).toBe('flat')
  expect(frameContact([0.1, 0.1, -0.98])).toBe('flat')
  // A face tipped by 20° lands on its corner.
  expect(frameContact([0.24, 0.24, 0.94])).toBe('corner')
  expect(frameContact([0, -1, 0])).toBe('edge')
  expect(frameContact([0.98, 0.1, 0.2])).toBe('edge')
  expect(frameContact([0.7, -0.7, 0.1])).toBe('corner')
  for (const sound of Object.keys(frameImpactSounds) as Array<keyof typeof frameImpactSounds>) {
    const recipes = new Set((['corner', 'edge', 'flat'] as const).map(contact => JSON.stringify(frameImpactVoices(contact, 4, sound))))
    expect(recipes.size).toBe(3)
    expect(frameImpactVoices('edge', 0.1, sound)).toEqual([])
    const loudness = (speed: number) => frameImpactVoices('corner', speed, sound).reduce((sum, voice) => sum + voice.volume, 0)
    expect(loudness(1)).toBeLessThan(loudness(8))
  }
  expect(frameImpactVoices('edge', 4, 'hardwood')).not.toEqual(frameImpactVoices('edge', 4))
})
test('every frame sounds like one of the shared frame sounds, gilded wood unless it says otherwise', () => {
  expect(frames.classic.impactSound).toBe('gilt')
  expect(frames['bastion-oak'].impactSound).toBe('hardwood')
  expect(frames['bastion-strapwork'].impactSound).toBe('heavy')
  for (const frame of Object.values(frames)) {
    expect(Object.keys(frameImpactSounds)).toContain(frame.impactSound)
  }
})

import type {KnotLightImpact} from '../../src/lib/physics/KnotLightImpacts.ts'

import {expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import KnotLightPanels, {knotLightDiffuserSize, knotLightDiffuserY, knotLightHousingSize, knotLightHousingY} from 'knot-materials/KnotLightPanels.ts'
import KnotLightDamage from 'knot-materials/KnotLights.ts'
import {Raycaster, Vector3} from 'three/webgpu'

import {dineCeilingUnderside, dineLedLight, dineLedSlots} from '../../src/lib/gallery/dine.ts'
import {rooms} from '../../src/lib/gallery/walls.ts'
import KnotLightImpacts from '../../src/lib/physics/KnotLightImpacts.ts'
import {beginBodyThrow} from '../../src/lib/physics/ThrowState.ts'

type PointSource = {
  intensity: number
  position: Vector3
}

await RAPIER.init()
const dine = rooms.find(room => room.id === 'dine')!
const half = [knotLightHousingSize[0] / 2, knotLightHousingSize[2] / 2] as const
const up = new Vector3(0, 1, 0)
const mirrored = (value: number, center: number) => 2 * center - value
const local = (x: number, y: number, z: number) => new Vector3(dine.center[0] + x, y, dine.center[1] + z)
/** Three’s physically based point light: I / d² with a smooth range cutoff, times the cosine at the receiver. */
const irradiance = (lights: Array<PointSource>, point: Vector3, normal: Vector3) => {
  let sum = 0
  for (const light of lights) {
    const offset = light.position.clone().sub(point)
    const distance = offset.length()
    const cutoff = Math.min(1, Math.max(0, 1 - (distance / dineLedLight.distance) ** 4)) ** 2
    sum += light.intensity / distance ** 2 * cutoff * Math.max(0, offset.normalize().dot(normal))
  }
  return sum
}
const meanIrradiance = (lights: Array<PointSource>) => {
  const [width, depth] = dine.size
  const floor: Array<number> = []
  const walls: Array<number> = []
  for (let x = -width / 2 + 0.25; x < width / 2; x += 0.5) {
    for (let z = -depth / 2 + 0.25; z < depth / 2; z += 0.5) {
      floor.push(irradiance(lights, local(x, 0, z), up))
    }
  }
  for (let y = 1; y <= 3; y += 0.5) {
    for (let x = -width / 2 + 0.25; x < width / 2; x += 0.5) {
      walls.push(irradiance(lights, local(x, y, -depth / 2), new Vector3(0, 0, 1)), irradiance(lights, local(x, y, depth / 2), new Vector3(0, 0, -1)))
    }
    for (let z = -depth / 2 + 0.25; z < depth / 2; z += 0.5) {
      walls.push(irradiance(lights, local(-width / 2, y, z), new Vector3(1, 0, 0)), irradiance(lights, local(width / 2, y, z), new Vector3(-1, 0, 0)))
    }
  }
  const mean = (values: Array<number>) => values.reduce((sum, value) => sum + value, 0) / values.length
  return {
    floor: mean(floor),
    walls: mean(walls),
  }
}
test('six panes hang in a grid that is symmetric about the room center and clear of walls and each other', () => {
  expect(dineLedSlots).toHaveLength(6)
  const ids = new Set(dineLedSlots.map(slot => slot.id))
  expect(ids.size).toBe(6)
  for (const slot of dineLedSlots) {
    const [x, , z] = slot.position
    expect(dineLedSlots.some(other => Math.abs(other.position[0] - mirrored(x, dine.center[0])) < 1e-9 && Math.abs(other.position[2] - z) < 1e-9)).toBe(true)
    expect(dineLedSlots.some(other => Math.abs(other.position[2] - mirrored(z, dine.center[1])) < 1e-9 && Math.abs(other.position[0] - x) < 1e-9)).toBe(true)
    // Walls are 0.21 m thick and centered on the room edge.
    expect(Math.abs(x - dine.center[0]) + half[0]).toBeLessThan(dine.size[0] / 2 - 0.105 - 1)
    expect(Math.abs(z - dine.center[1]) + half[1]).toBeLessThan(dine.size[1] / 2 - 0.105 - 1)
    for (const other of dineLedSlots) {
      if (other === slot) {
        continue
      }
      const gap = Math.max(Math.abs(other.position[0] - x) - 2 * half[0], Math.abs(other.position[2] - z) - 2 * half[1])
      expect(gap).toBeGreaterThan(2)
    }
  }
})
test('housings meet the ceiling without a gap and the diffuser is the first surface seen from below', () => {
  const panels = new KnotLightPanels(dineLedSlots, 'dine-led')
  try {
    expect(panels.housings.name).toBe('dine-led-housings')
    expect(panels.diffusers.name).toBe('dine-led-diffusers')
    for (const slot of dineLedSlots) {
      const top = slot.position[1] + knotLightHousingY + knotLightHousingSize[1] / 2
      expect(top - dineCeilingUnderside).toBeCloseTo(0.005, 9)
      for (const dx of [-0.9, 0, 0.9]) {
        const ray = new Raycaster(new Vector3(slot.position[0] + dx, 1.6, slot.position[2]), up)
        const hits = ray.intersectObjects([panels.housings, panels.diffusers])
        expect(hits[0].object).toBe(panels.diffusers)
        expect(hits[0].point.y).toBeCloseTo(slot.position[1] + knotLightDiffuserY - knotLightDiffuserSize[1] / 2, 5)
      }
    }
  } finally {
    panels.dispose()
  }
})
test('the pane lights replace the old pair without changing how bright floor and walls are', () => {
  const before = [-3.5, 3.5].map(z => ({
    intensity: 32,
    position: local(0, 4.9, z),
  }))
  const after = dineLedSlots.map(slot => ({
    intensity: dineLedLight.intensity,
    position: new Vector3(slot.position[0], slot.position[1] - dineLedLight.drop, slot.position[2]),
  }))
  for (const light of after) {
    // Each light sits below its own diffuser, close enough that the housing hides its brightest ceiling spot.
    expect(light.position.y).toBeLessThan(dineLedSlots[0].position[1] + knotLightDiffuserY - knotLightDiffuserSize[1] / 2)
  }
  const old = meanIrradiance(before)
  const current = meanIrradiance(after)
  expect(current.floor / old.floor).toBeGreaterThan(0.9)
  expect(current.floor / old.floor).toBeLessThan(1.1)
  expect(current.walls / old.walls).toBeGreaterThan(0.9)
  expect(current.walls / old.walls).toBeLessThan(1.1)
})
test('a prop thrown at a dine pane cracks it first, then knocks the diffuser loose', () => {
  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  try {
    const target = 3
    const [x, y, z] = dineLedSlots[target].position
    // The room’s ceiling collider, exactly as the architecture builds it.
    world.createCollider(RAPIER.ColliderDesc.cuboid(dine.size[0] / 2, 0.15, dine.size[1] / 2).setTranslation(dine.center[0], 5.9, dine.center[1]))
    const fixed = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
    const impacts = new KnotLightImpacts
    impacts.register(world.createCollider(RAPIER.ColliderDesc.cuboid(half[0], knotLightHousingSize[1] / 2, half[1]).setTranslation(x, y + knotLightHousingY, z), fixed), target)
    impacts.register(world.createCollider(RAPIER.ColliderDesc.cuboid(knotLightDiffuserSize[0] / 2, knotLightDiffuserSize[1] / 2, knotLightDiffuserSize[2] / 2).setTranslation(x, y + knotLightDiffuserY, z), fixed), target)
    const damage = new KnotLightDamage(dineLedSlots.length)
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCcdEnabled(true))
    // Same mass as every grabbable prop.
    world.createCollider(RAPIER.ColliderDesc.ball(0.15).setMass(1.8), body)
    const hits: Array<KnotLightImpact> = []
    const throwAt = (time: number) => {
      body.setTranslation({
        x: x + 0.3,
        y: 1.6,
        z: z - 0.2,
      }, true)
      body.setLinvel({
        x: 0,
        y: 12,
        z: 0,
      }, true)
      beginBodyThrow(body)
      for (let step = 0; step < 90; step++) {
        impacts.capture(world)
        world.step()
        impacts.collect(world, (index, impact) => {
          if (damage.hit(index, impact.mass, impact.speed, time + step / 60, impact.attackId)) {
            hits.push(impact)
          }
        })
      }
    }
    throwAt(0)
    expect(hits).toHaveLength(1)
    expect(damage.stage(target)).toBe(1)
    expect(hits[0].point.y).toBeCloseTo(y + knotLightDiffuserY - knotLightDiffuserSize[1] / 2, 2)
    const flicker = Array.from({length: 120}, (_, frame) => damage.intensity(target, 1 + frame / 60))
    expect(Math.min(...flicker)).toBeLessThan(0.6)
    expect(Math.max(...flicker)).toBeLessThanOrEqual(1)
    throwAt(5)
    expect(hits).toHaveLength(2)
    expect(damage.stage(target)).toBe(2)
    expect(damage.intensity(target, 10)).toBe(0)
    expect(dineLedSlots.every((_, index) => index === target || damage.stage(index) === 0)).toBe(true)
  } finally {
    world.free()
  }
})

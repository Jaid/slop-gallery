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

await RAPIER.init()
const dine = rooms.find(room => room.id === 'dine')!
const half = [knotLightHousingSize[0] / 2, knotLightHousingSize[2] / 2] as const
const up = new Vector3(0, 1, 0)
const mirrored = (value: number, center: number) => 2 * center - value
test('three panes hang down the middle, symmetric about the room center and clear of walls and each other', () => {
  expect(dineLedSlots).toHaveLength(3)
  const ids = new Set(dineLedSlots.map(slot => slot.id))
  expect(ids.size).toBe(3)
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
test('each pane light sits below its own diffuser, close enough that the housing hides its brightest ceiling spot', () => {
  for (const slot of dineLedSlots) {
    expect(slot.position[1] - dineLedLight.drop).toBeLessThan(slot.position[1] + knotLightDiffuserY - knotLightDiffuserSize[1] / 2)
  }
})
test('a prop thrown at a dine pane cracks it first, then knocks the diffuser loose', () => {
  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  try {
    const target = 1
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

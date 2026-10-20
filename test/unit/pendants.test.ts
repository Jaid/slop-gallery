import type {PendantBody, PendantMount} from '../../src/lib/gallery/pendants/index.ts'

import {afterAll, describe, expect, test} from 'bun:test'

import {BoxGeometry, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {corridorPassage, corridorStairs} from '../../src/lib/gallery/corridor.ts'
import {lodgeTunnel, lodgeTunnelTransition, lodgeWindowRibCutouts} from '../../src/lib/gallery/lodge.ts'
import LodgeWindowGeometry from '../../src/lib/gallery/LodgeWindowGeometry.ts'
import TimberGeometry from '../../src/lib/gallery/passages/TimberGeometry.ts'
import TransitionGeometry from '../../src/lib/gallery/passages/TransitionGeometry.ts'
import VaultGeometry from '../../src/lib/gallery/passages/VaultGeometry.ts'
import {CeilingProbe, GlobeBody, LanternBody, PendantGeometry} from '../../src/lib/gallery/pendants/index.ts'
import {corridorLightSpacing, passageLightHeight, passagePendantMounts, stairLightHeight, stairLightSteps, stairPendantMounts} from '../../src/lib/gallery/pendants/mounts.ts'
import {canopyEmbed, canopyHeight, canopyRadius} from '../../src/lib/gallery/pendants/PendantGeometry.ts'
import {triangleCount} from '../../src/lib/geometry.ts'

const vault = new VaultGeometry(lodgeTunnel, lodgeTunnelTransition.length)
const corridor = TimberGeometry.passage(corridorPassage, lodgeWindowRibCutouts)
const stairs = TimberGeometry.stairs(corridorStairs)
const transition = new TransitionGeometry(lodgeTunnelTransition)
const lodgeWindow = new LodgeWindowGeometry
const material = new MeshBasicMaterial({side: DoubleSide})
// The flat roof slabs over passage elbows, as rendered by CoveredPassage.
const slabs = [lodgeTunnel, corridorPassage].flatMap(passage => passage.floors.map(({center: [x, z], size: [width, depth]}) => {
  const slab = new BoxGeometry(width, 0.24, depth)
  return slab.translate(x, passage.floorY + passage.height + 0.12, z)
}))
const meshes = [vault.shell, vault.ribs, corridor.shell, corridor.ribs, stairs.shell, stairs.ribs, transition.timber, transition.lining, lodgeWindow.frame, lodgeWindow.lining, ...slabs].map(geometry => {
  const mesh = new Mesh(geometry, material)
  mesh.updateMatrixWorld()
  return mesh
})
const lantern = new LanternBody
const globe = new GlobeBody
const groups: Array<{
  body: PendantBody
  label: string
  mounts: Array<PendantMount>
}> = [
  {
    label: 'castle tunnel',
    body: lantern,
    mounts: passagePendantMounts(lodgeTunnel, [vault.shell, vault.ribs]),
  },
  {
    label: 'timber corridor',
    body: lantern,
    mounts: passagePendantMounts(corridorPassage, [corridor.shell, corridor.ribs], corridorLightSpacing),
  },
  {
    label: 'corridor stairs',
    body: globe,
    mounts: stairPendantMounts(corridorStairs, [stairs.shell, stairs.ribs]),
  },
]
const stairNominal = stairLightSteps.map(step => {
  const block = corridorStairs.blocks[step]
  return [block.position[0], block.top + stairLightHeight, block.position[2]] as const
})
afterAll(() => {
  for (const geometry of [vault, corridor, stairs, transition, lodgeWindow, ...slabs]) {
    geometry.dispose()
  }
  material.dispose()
})
const firstHit = (origin: Vector3, direction: Vector3, far = Infinity) => {
  const raycaster = new Raycaster(origin, direction.clone().normalize(), 0, far)
  return raycaster.intersectObjects(meshes)[0]
}
describe('ceiling-hung pendants', () => {
  test('every light hangs at its passage height or beside its stair step', () => {
    expect(groups[0].mounts).toHaveLength(5)
    expect(groups[1].mounts).toHaveLength(8)
    expect(groups[2].mounts).toHaveLength(stairLightSteps.length)
    for (const [i, passage] of [lodgeTunnel, corridorPassage].entries()) {
      for (const mount of groups[i].mounts) {
        expect(mount.light[1]).toBeCloseTo(passage.floorY + passageLightHeight)
      }
    }
    for (const [i, mount] of groups[2].mounts.entries()) {
      expect(Math.hypot(mount.light[0] - stairNominal[i][0], mount.light[2] - stairNominal[i][2])).toBeLessThanOrEqual(0.6)
      expect(mount.light[1]).toBeCloseTo(stairNominal[i][1])
    }
  })
  for (const {label, body, mounts} of groups) {
    test(`${label}: the rod reaches the first ceiling straight above each light`, () => {
      for (const mount of mounts) {
        const hook = new Vector3(...mount.light)
        hook.y += body.hook
        const hit = firstHit(hook, new Vector3(0, 1, 0))
        expect(hit).toBeDefined()
        expect(hit.point.y).toBeCloseTo(mount.anchor[1], 4)
        expect(mount.drop).toBeCloseTo(mount.anchor[1] - mount.light[1], 6)
        // Room for a visible rod between the fixture and its canopy.
        expect(mount.drop - body.hook).toBeGreaterThan(canopyHeight + 0.03)
      }
    })
    test(`${label}: canopies sit flush on the ceiling, without gaps or overhanging rib edges`, () => {
      for (const mount of mounts) {
        const down = new Vector3(...mount.normal)
        const tangent = new Vector3(0, 0, 1)
        tangent.cross(down).normalize()
        if (tangent.lengthSq() < 0.5) {
          tangent.set(1, 0, 0)
        }
        const bitangent = down.clone().cross(tangent).normalize()
        // The canopy’s top face, sunk into the ceiling.
        const top = new Vector3(...mount.anchor)
        top.addScaledVector(down, -canopyEmbed)
        for (let i = 0; i < 24; i++) {
          const angle = i / 24 * Math.PI * 2
          const rim = top.clone().addScaledVector(tangent, Math.cos(angle) * canopyRadius).addScaledVector(bitangent, Math.sin(angle) * canopyRadius)
          const below = rim.clone().addScaledVector(down, canopyHeight)
          const hit = firstHit(below, down.clone().negate(), 1)
          // The ceiling crosses the canopy’s side wall: neither floating below nor buried above it.
          expect(hit).toBeDefined()
          expect(hit.distance).toBeGreaterThan(0)
          expect(hit.distance).toBeLessThan(canopyHeight)
        }
      }
    })
    test(`${label}: fixtures stay clear of walls, ribs and portals`, () => {
      for (const mount of mounts) {
        const light = new Vector3(...mount.light)
        for (const height of [body.bottom + 0.01, 0, body.hook - 0.01]) {
          for (let i = 0; i < 16; i++) {
            const angle = i / 16 * Math.PI * 2
            const origin = light.clone().setY(light.y + height)
            expect(firstHit(origin, new Vector3(Math.cos(angle), 0, Math.sin(angle)), body.radius + 0.05)).toBeUndefined()
          }
        }
        expect(firstHit(light.clone().setY(light.y + body.bottom + 0.01), new Vector3(0, -1, 0), 1.5)).toBeUndefined()
      }
    })
    test(`${label}: geometry is finite, compact and reaches its canopy`, () => {
      for (const mount of mounts) {
        const geometry = new PendantGeometry(body, mount)
        try {
          for (const part of [geometry.frame, geometry.glow]) {
            for (const attribute of Object.values(part.attributes)) {
              expect([...attribute.array].every(Number.isFinite)).toBe(true)
            }
          }
          expect(triangleCount(geometry.frame) + triangleCount(geometry.glow)).toBeLessThan(700)
          geometry.frame.computeBoundingBox()
          geometry.glow.computeBoundingBox()
          const bounds = geometry.frame.boundingBox!.clone().union(geometry.glow.boundingBox!)
          expect(bounds.max.y).toBeGreaterThan(mount.drop - canopyEmbed - 0.002)
          expect(bounds.max.y).toBeLessThan(mount.drop + 0.04)
          expect(bounds.min.y).toBeCloseTo(body.bottom, 3)
        } finally {
          geometry.dispose()
        }
      }
    })
  }
  test('stair globes hang well above the heads of people on the treads', () => {
    for (const mount of groups[2].mounts) {
      const floor = corridorStairs.blocks.find(block => Math.abs(mount.light[0] - block.position[0]) <= block.size[0] / 2)!
      expect(mount.light[1] + globe.bottom - floor.top).toBeGreaterThan(2.2)
    }
  })
  test('a probe without a ceiling above refuses to mount, and slides only horizontally', () => {
    const probe = new CeilingProbe([vault.shell])
    expect(probe.mount([1000, 0, 1000], [1, 0, 0])).toBeUndefined()
    expect(() => probe.mount([0, 0, 0], [0, 1, 0])).toThrow(RangeError)
    expect(() => probe.mount([0, 0, 0], [0, 0, 0])).toThrow(RangeError)
    expect(() => new PendantGeometry(lantern, {
      drop: 0.1,
      normal: [0, -1, 0],
    })).toThrow(RangeError)
    expect(() => new PendantGeometry(lantern, {
      drop: 1,
      normal: [0, 1, 0],
    })).toThrow(RangeError)
  })
})

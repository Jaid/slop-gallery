import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import EgoMotor from 'ego-player/motor'
import {Quaternion, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry, wallFace} from '../../src/lib/gallery/architecture.ts'
import {bastionApproach, bastionArch, bastionDoorway, bastionHairpin, bastionLanterns, bastionMouth, bastionOrigin, bastionRun, bastionScreen} from '../../src/lib/gallery/bastion.ts'
import cinnabar from '../../src/lib/gallery/cinnabar.ts'
import {easedRampGradient} from '../../src/lib/gallery/easedRamp.ts'
import {slabCorners} from '../../src/lib/gallery/floorPolygons.ts'
import {fortressApproach, fortressDoorway} from '../../src/lib/gallery/fortress.ts'
import lodge from '../../src/lib/gallery/lodge.ts'
import OculusGroundGeometry from '../../src/lib/gallery/OculusGroundGeometry.ts'
import tower, {towerBridge, towerFloorHeight} from '../../src/lib/gallery/oculusTower.ts'
import RouteVaultGeometry from '../../src/lib/gallery/passages/RouteVaultGeometry.ts'
import VaultGeometry from '../../src/lib/gallery/passages/VaultGeometry.ts'
import {vesper} from '../../src/lib/gallery/vesper.ts'
import {insideOpening, wallCoordinates, wallPosition} from '../../src/lib/placement/wallGeometry.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'
import walls, {floorHeight, insideGallery, roomAt} from './fixtures/gallery.ts'
import {addOculusRailings} from './helpers/oculusRailings.ts'

await RAPIER.init()
const {route} = bastionHairpin
const straight = [bastionMouth, bastionRun, bastionApproach] as const
const hairpin = new RouteVaultGeometry(bastionHairpin)
const vaults = straight.map(passage => new VaultGeometry(passage))
const ground = new OculusGroundGeometry
const architecture = walls.filter(wall => wall.room === 'bastion' || wall.id === 'oculus-west' || wall.id === 'cinnabar-north').map(wall => ({
  wall,
  geometry: createArchitectureGeometry(wall),
}))
afterAll(() => {
  hairpin.dispose()
  for (const vault of vaults) {
    vault.dispose()
  }
  ground.dispose()
  for (const {geometry} of architecture) {
    geometry.dispose()
  }
})
const wallById = (id: string) => walls.find(wall => wall.id === id)!
/** how steeply the hairpin’s floor climbs `along` meters down it, over 2 cm */
const slope = (along: number) => (route.at(along + 0.01).y - route.at(along - 0.01).y) / 0.02
/** stations every half meter along the hairpin’s center line */
const stations = Array.from({length: Math.floor(route.length / 0.5) + 1}, (_, i) => route.at(i * 0.5))
/** the corners of a straight passage’s path after its start, which a player walks round carefully */
const elbows = (passage: typeof straight[number]) => passage.path.slice(1).map(([x, z]): readonly [number, number, boolean] => [x, z, true])
/** points every half meter along a straight passage’s center line, with its floor height */
const along = (passage: typeof straight[number]) => passage.spans.flatMap(({start, end, length}) => Array.from({length: Math.floor(length / 0.5) + 1}, (_, i) => {
  const t = i * 0.5 / length
  return [start[0] + (end[0] - start[0]) * t, passage.floorY, start[1] + (end[1] - start[1]) * t] as const
}))
describe('the Bastion’s way from the Oculus up to the Cinnabar', () => {
  test('its passages join end to end, from the doorway at the west bridge to the middle of the Cinnabar’s north wall', () => {
    expect(bastionDoorway).toEqual({
      ...fortressDoorway,
      x: -fortressDoorway.x,
    })
    expect(bastionMouth.path[0]).toEqual([bastionDoorway.x, bastionDoorway.z])
    expect(route.start).toEqual(bastionMouth.path.at(-1)!)
    expect(route.end.point[0]).toBeCloseTo(bastionRun.path[0][0], 9)
    expect(route.end.point[1]).toBeCloseTo(bastionRun.path[0][1], 9)
    expect(route.end.heading).toBeCloseTo(-Math.PI / 2, 9)
    expect(bastionRun.path.at(-1)).toEqual(bastionApproach.path[0])
    expect(bastionApproach.path.at(-1)).toEqual([cinnabar.center[0], cinnabar.center[1] - cinnabar.size[1] / 2])
    // From the west bridge’s end up to the Cinnabar’s floor
    expect(bastionMouth.floorY).toBeCloseTo(tower.floorY + tower.height + towerBridge.rise, 9)
    expect(route.y).toBe(bastionMouth.floorY)
    expect(route.height).toBe(bastionMouth.height)
    expect(route.end.y).toBe(0)
    expect([bastionRun.floorY, bastionApproach.floorY]).toEqual([0, 0])
    expect([bastionRun.height, bastionApproach.height]).toEqual([3.1, 3.1])
    // As wide as the Fortress up to the screen wall, and narrower along the strip behind the Cinnabar
    expect([bastionMouth.width, bastionHairpin.width, bastionRun.width]).toEqual([4, 4, 4])
    expect(bastionApproach.width).toBe(2.6)
  })
  test('the hairpin eases up by the whole climb over its two legs and its turn, no steeper than 1 in 4', () => {
    const [west, turn, east] = route.pieces
    expect([west.kind, turn.kind, east.kind]).toEqual(['line', 'arc', 'line'])
    expect(west.length).toBeCloseTo(east.length, 9)
    expect(turn.kind === 'arc' && Math.abs(turn.sweep)).toBeCloseTo(Math.PI, 9)
    expect(west.ramp).toBe(turn.ramp)
    expect(turn.ramp).toBe(east.ramp)
    const ramp = west.ramp!
    expect([ramp.from, ramp.length]).toEqual([0, route.length])
    expect([ramp.startY, ramp.endY]).toEqual([bastionMouth.floorY, 0])
    expect(Math.abs(slope(0.02))).toBeLessThan(0.025)
    expect(Math.abs(slope(route.length - 0.02))).toBeLessThan(0.025)
    expect((0 - bastionMouth.floorY) * easedRampGradient(route.length / 2, route.length)).toBeCloseTo(0.25, 9)
    let previous = bastionMouth.floorY
    for (let distance = 0; distance <= route.length; distance += 0.05) {
      const {y} = route.at(distance)
      expect(y - previous).toBeGreaterThanOrEqual(0)
      expect(y - previous).toBeLessThanOrEqual(0.25 * 0.05 + 1e-9)
      previous = y
    }
  })
  test('navigation follows its floors and fences the whole way, the run north over the mouth and over the Lodge included', () => {
    for (const passage of straight) {
      for (const [x, y, z] of along(passage)) {
        const position: Vec3 = [x, y + 1.6, z]
        expect(passage.floorAt(x, z)).toBe(y)
        expect(insideGallery(position)).toBe(true)
        expect(floorHeight(position)).toBeCloseTo(y, 6)
        expect(roomAt(position)).toBe('bastion')
      }
    }
    for (const {point: [x, z], y} of stations) {
      const position: Vec3 = [x, y + 1.6, z]
      expect(bastionHairpin.floorAt(x, z)).toBeCloseTo(y, 6)
      expect(insideGallery(position)).toBe(true)
      expect(floorHeight(position)).toBeCloseTo(y, 6)
      expect(roomAt(position)).toBe('bastion')
    }
    // Where the run crosses over the mouth, the floor under a player is the one they stand on.
    const [crossingX] = bastionRun.path[0]
    const crossingZ = bastionDoorway.z
    expect(floorHeight([crossingX, 1.6, crossingZ])).toBe(0)
    expect(floorHeight([crossingX, bastionMouth.floorY + 1.6, crossingZ])).toBe(bastionMouth.floorY)
    expect(roomAt([crossingX, 1.6, crossingZ])).toBe('bastion')
    expect(roomAt([crossingX, bastionMouth.floorY + 1.6, crossingZ])).toBe('bastion')
    // Over the Lodge, the run is the Bastion’s and the room under it stays the Lodge’s.
    const overLodge: Vec3 = [crossingX, 1.6, lodge.center[1]]
    expect(roomAt(overLodge)).toBe('bastion')
    expect(roomAt([crossingX, lodge.floorY + 1.6, lodge.center[1]])).toBe('lodge')
    expect(floorHeight(overLodge)).toBe(0)
  })
  test('the run north clears the Lodge’s roof and the approach keeps off the Cinnabar’s and the Fortress’ walls along the strip', () => {
    // The Lodge’s ceiling slab tops out 24 cm over its height; the run’s floor slab hangs 24 cm under its floor.
    expect(bastionRun.floorY - 0.24).toBeGreaterThan(lodge.floorY + lodge.height + 0.24 + 0.3)
    const [, , [, stripZ]] = bastionApproach.path
    const cinnabarNorthZ = cinnabar.center[1] - cinnabar.size[1] / 2
    const fortressSouthZ = fortressApproach.path[0][1] + fortressApproach.width / 2
    expect(stripZ - bastionApproach.width / 2 - wallFace).toBeGreaterThan(fortressSouthZ + wallFace + 0.3)
    expect(cinnabarNorthZ - wallFace - (stripZ + bastionApproach.width / 2 + wallFace)).toBeGreaterThan(0.3)
    // Behind the Cinnabar’s west wall, the hairpin’s east leg keeps the Fortress’ clearance, and the turn stays off the Vesper’s.
    const cinnabarWestX = cinnabar.center[0] - cinnabar.size[0] / 2
    expect(cinnabarWestX - (route.end.point[0] + bastionHairpin.width / 2)).toBeCloseTo(0.3, 9)
    const vesperWestX = vesper.center[0] - vesper.size[0] / 2
    for (const station of stations) {
      for (const side of [-1, 1]) {
        const reach = bastionHairpin.reach(station, side)
        expect(station.point[0] - Math.sin(station.heading) * side * reach).toBeLessThanOrEqual(vesperWestX - 0.3 + 1e-9)
      }
    }
  })
  test('beside the passages, behind their walls, lies neither the Bastion nor anything else', () => {
    for (const station of stations) {
      const {point: [x, z], heading, y} = station
      for (const side of [-1, 1]) {
        const out = bastionHairpin.reach(station, side) + 0.2
        const beside: Vec3 = [x - Math.sin(heading) * side * out, y + 1.6, z + Math.cos(heading) * side * out]
        expect(bastionHairpin.floorAt(beside[0], beside[2])).toBeUndefined()
        expect(insideGallery(beside)).toBe(false)
      }
    }
    for (const passage of [bastionRun, bastionApproach]) {
      for (const {start, end, from, to} of passage.spans) {
        const length = Math.hypot(end[0] - start[0], end[1] - start[1])
        const [dx, dz] = [(end[0] - start[0]) / length, (end[1] - start[1]) / length]
        for (const share of [0.3, 0.6]) {
          const distance = from + (to - from) * share
          for (const side of [-1, 1]) {
            const out = passage.width / 2 + 0.2
            const beside: Vec3 = [start[0] + dx * distance - dz * side * out, passage.floorY + 1.6, start[1] + dz * distance + dx * side * out]
            expect(insideGallery(beside)).toBe(false)
          }
        }
      }
    }
  })
  test('the screen wall closes the broad run where the narrow approach begins, with an arch as wide and as high as the approach’s vault', () => {
    const screen = wallById('bastion-screen')
    expect(screen.center).toEqual([bastionRun.path[1][0], 0, bastionRun.path[1][1]])
    expect(screen.width).toBe(bastionRun.width)
    expect(screen.height + 0.3).toBe(bastionRun.height)
    expect(screen.rotation).toBe(0)
    expect(screen.sticky).toBe(false)
    expect(screen.cornice).toBe(false)
    expect(screen.miters).toEqual([1, 1])
    expect(architecture.find(({wall}) => wall.id === 'bastion-screen')!.geometry.cornice).toEqual([])
    expect(bastionApproach.walls.every(wall => wall.cornice === false)).toBe(true)
    expect(screen.holes).toEqual([{
      ...bastionArch,
      name: 'approach',
      u: 0,
    }])
    expect(bastionScreen).toMatchObject({
      id: 'bastion-screen',
      room: 'bastion',
    })
    // Its arch is the approach’s section: the approach’s walls stand at its jambs, and its crown at the approach’s.
    const jambs = bastionApproach.walls.filter(wall => Math.abs(Math.abs(wall.center[0] - bastionApproach.path[0][0]) - bastionApproach.width / 2) < 1e-6)
    expect(jambs).toHaveLength(2)
    expect(Math.abs(jambs[0].center[0] - jambs[1].center[0])).toBeCloseTo(bastionArch.width, 9)
    expect(bastionApproach.height).toBe(bastionArch.height)
    // Facing south down the run: half a meter in front of it lies the run’s floor, half a meter behind it the approach’s.
    const [frontX, , frontZ] = wallPosition(screen, 1.5, 0, 0.5)
    const [backX, , backZ] = wallPosition(screen, 0, 0, -0.5)
    expect(bastionRun.floorAt(frontX, frontZ)).toBe(0)
    expect(bastionApproach.floorAt(backX, backZ)).toBe(0)
    expect(bastionApproach.floorAt(frontX, frontZ)).toBeUndefined()
  })
  test('the doorways at both ends match the passages that lead through them', () => {
    const oculusWest = wallById('oculus-west')
    const bastion = oculusWest.holes!.find(hole => hole.name === 'bastion')!
    const fortress = wallById('oculus-east').holes!.find(hole => hole.name === 'fortress')!
    // The Fortress’ doorway mirrored: the same opening, measured the other way along its wall
    expect<typeof fortress>({
      ...bastion,
      name: 'fortress',
      u: -bastion.u,
    }).toEqual(fortress)
    expect(wallPosition(oculusWest, bastion.u, 0, 0)[2]).toBeCloseTo(bastionDoorway.z, 9)
    const north = wallById('cinnabar-north')
    const arch = north.holes!.find(hole => hole.name === 'bastion')!
    expect(arch).toMatchObject(bastionArch)
    const [x, , z] = wallPosition(north, arch.u, 0, 0)
    expect([x, z]).toEqual([cinnabar.center[0], cinnabar.center[1] - cinnabar.size[1] / 2])
    expect(insideOpening(arch, wallCoordinates(north, [cinnabar.center[0], 0, z]), 1.7)).toBe(true)
    expect(roomAt([cinnabar.center[0], 1.7, z + 0.1])).toBe('cinnabar')
    expect(roomAt([cinnabar.center[0], 1.7, z - 0.1])).toBe('bastion')
  })
  test('its lanterns hang between the hairpin’s ribs and its lamps under them', () => {
    for (const hung of Object.values(bastionLanterns)) {
      expect(bastionHairpin.ribs.some(rib => Math.abs(rib - hung) < 0.3)).toBe(false)
    }
    const lamps = slopGallery.room('bastion').lamps()
    expect(lamps.map(({id}) => id).toSorted()).toEqual(['bastion-lantern_east', 'bastion-lantern_elbow', 'bastion-lantern_mouth', 'bastion-lantern_run', 'bastion-lantern_strip', 'bastion-lantern_turn', 'bastion-lantern_west'])
    for (const {position} of lamps) {
      expect(roomAt(position)).toBe('bastion')
      // Under the crown, over a person’s head
      expect(position[1] - floorHeight(position)).toBeGreaterThan(1.7)
      expect(position[1] - floorHeight(position)).toBeLessThan(2.3)
    }
  })
  test('its origin lies on its floor at the apex of the hairpin’s turn', () => {
    const [west, turn] = route.pieces
    const apex = route.at(west.length + turn.length / 2)
    expect(bastionOrigin).toEqual([apex.point[0], apex.y, apex.point[1]])
    expect(bastionOrigin[1]).toBeCloseTo(bastionMouth.floorY / 2, 9)
    expect(slopGallery.room('bastion').spawn.position[1]).toBeGreaterThan(bastionMouth.floorY)
  })
  for (const sprint of [false, true]) {
    for (const returning of [false, true]) {
      test(`a player walks from the west bridge through the doorway up the hairpin and round into the Cinnabar, sprint ${sprint}, returning ${returning}`, () => {
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
        for (const geometry of [ground, hairpin.paving, hairpin.shell, hairpin.ribs, ...vaults.flatMap(vault => [vault.shell, vault.ribs])]) {
          world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(geometry)))
        }
        for (const passage of straight) {
          for (const floor of passage.floors) {
            world.createCollider(RAPIER.ColliderDesc.convexHull(slabCorners(floor, passage.floorY - 0.24, passage.floorY))!)
          }
        }
        world.createCollider(RAPIER.ColliderDesc.cuboid(cinnabar.size[0] / 2, 0.12, cinnabar.size[1] / 2).setTranslation(cinnabar.center[0], -0.12, cinnabar.center[1]))
        addOculusRailings(world)
        const bridgeX = tower.x - 5
        const bridge = towerFloorHeight(bridgeX, tower.z)!
        // Through the doorway and round every elbow like a player, at a walk; the straight stretches at a sprint if asked.
        const path: Array<readonly [x: number, z: number, careful?: boolean]> = [
          [bridgeX, tower.z],
          [bastionDoorway.x - 0.6, tower.z, true],
          ...elbows(bastionMouth),
          ...stations.filter((_, i) => i % 2 === 0).map(({point}) => point),
          ...elbows(bastionRun),
          ...elbows(bastionApproach),
          [cinnabar.center[0], cinnabar.center[1] - 3],
        ]
        if (returning) {
          path.reverse()
        }
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(path[0][0], (returning ? 0 : bridge) + 0.04, path[0][1]))
        const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
        const motor = new EgoMotor(RAPIER, world, body, collider)
        const facing = new Quaternion
        try {
          let target = 1
          for (let i = 0; i < fps * 90 && target < path.length; i++) {
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
          const {x, z} = body.translation()
          expect(body.translation().y).toBeCloseTo((returning ? towerFloorHeight(x, z)! : 0) + 0.02, 2)
          expect(motor.grounded).toBe(true)
        } finally {
          motor.dispose()
          world.free()
        }
      })
    }
  }
})

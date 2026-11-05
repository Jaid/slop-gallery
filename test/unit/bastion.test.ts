import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import EgoMotor from 'ego-player/motor'
import {Box2, ExtrudeGeometry, Matrix4, Quaternion, Vector2, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry, wallFace} from '../../src/lib/gallery/architecture.ts'
import {vaultShellThickness} from '../../src/lib/gallery/architectureDimensions.ts'
import {bastionApproach, bastionArch, bastionDoorway, bastionHairpin, bastionLanterns, bastionMouth, bastionMouthRunnel, bastionRun, bastionRunnel, bastionScreen} from '../../src/lib/gallery/bastion.ts'
import {easedRampGradient} from '../../src/lib/gallery/easedRamp.ts'
import {insidePolygon, slabCorners} from '../../src/lib/gallery/floorPolygons.ts'
import forge, {forgeVestibule} from '../../src/lib/gallery/forge.ts'
import {forgeRoundVestibule, vestibuleArches} from '../../src/lib/gallery/forgeVestibule.ts'
import {fortressDoorway} from '../../src/lib/gallery/fortress.ts'
import {fortressLinkGate} from '../../src/lib/gallery/fortressNetwork.ts'
import lodge from '../../src/lib/gallery/lodge.ts'
import OculusGroundGeometry from '../../src/lib/gallery/OculusGroundGeometry.ts'
import tower, {towerBridge, towerFloorHeight} from '../../src/lib/gallery/oculusTower.ts'
import RouteVaultGeometry from '../../src/lib/gallery/passages/RouteVaultGeometry.ts'
import VaultGeometry from '../../src/lib/gallery/passages/VaultGeometry.ts'
import roundRevealGeometry from '../../src/lib/gallery/roundRevealGeometry.ts'
import {roundVestibuleFloorShape} from '../../src/lib/gallery/roundVestibule.ts'
import {vesper} from '../../src/lib/gallery/vesper.ts'
import {insideOpening, wallCoordinates, wallPosition} from '../../src/lib/placement/wallGeometry.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'
import walls, {floorHeight, insideGallery, roomAt} from './fixtures/gallery.ts'
import {addOculusRailings} from './helpers/oculusRailings.ts'

await RAPIER.init()
const {route} = bastionHairpin
/** the climb’s routed passages, from the hairpin up to the vestibule */
const routed = [bastionHairpin, bastionRun, bastionApproach] as const
const routeVaults = routed.map(passage => new RouteVaultGeometry(passage))
const mouthVault = new VaultGeometry(bastionMouth)
const mouthGroove = bastionMouthRunnel.geometry()
const ground = new OculusGroundGeometry
const wallById = (id: string) => walls.find(wall => wall.id === id)!
const architecture = walls.filter(wall => wall.room === 'fortress' || ['forge-north', 'forge-vestibule', 'oculus-west'].includes(wall.id)).map(wall => ({
  wall,
  geometry: createArchitectureGeometry(wall),
}))
const vestibuleWall = wallById('forge-vestibule')
const vestibuleFloor = new ExtrudeGeometry(roundVestibuleFloorShape(forgeRoundVestibule), {
  depth: 0.24,
  bevelEnabled: false,
  curveSegments: 96,
})
vestibuleFloor.rotateX(-Math.PI / 2).translate(forgeVestibule.center[0], -0.24, forgeVestibule.center[1])
const vestibulePlacement = new Matrix4
vestibulePlacement.makeRotationY(vestibuleWall.rotation).setPosition(...vestibuleWall.center)
/** the vestibule’s floor slab and the reveals of its arches, in world meters */
const vestibuleParts = [
  vestibuleFloor,
  ...vestibuleArches.map(({name}) => {
    const reveal = roundRevealGeometry(vestibuleWall, vestibuleWall.holes!.find(hole => hole.name === name)!, bastionArch)
    return reveal.applyMatrix4(vestibulePlacement)
  }),
]
afterAll(() => {
  for (const vault of [...routeVaults, mouthVault]) {
    vault.dispose()
  }
  mouthGroove.dispose()
  ground.dispose()
  for (const {geometry} of architecture) {
    geometry.dispose()
  }
  for (const geometry of vestibuleParts) {
    geometry.dispose()
  }
})
/** how steeply the hairpin’s floor climbs `along` meters down it, over 2 cm */
const slope = (along: number) => (route.at(along + 0.01).y - route.at(along - 0.01).y) / 0.02
/** stations every half meter along the hairpin’s center line */
const stations = Array.from({length: Math.floor(route.length / 0.5) + 1}, (_, i) => route.at(i * 0.5))
/** the corners of the mouth’s path after its start, which a player walks round carefully */
const elbows = bastionMouth.path.slice(1).map(([x, z]): readonly [number, number, boolean] => [x, z, true])
/** the rectangle on the floor plan round the points, in x and z */
const area = (points: ReadonlyArray<readonly [number, number]>) => {
  const box = new Box2
  return box.setFromPoints(points.map(([x, z]) => new Vector2(x, z)))
}
/** stations every half meter along a routed passage’s center line */
const along = (passage: typeof routed[number]) => Array.from({length: Math.floor(passage.route.length / 0.5) + 1}, (_, i) => passage.route.at(i * 0.5))
/** points every half meter along the mouth’s center line, with its floor height */
const mouthPoints = bastionMouth.spans.flatMap(({start, end, length}) => Array.from({length: Math.floor(length / 0.5) + 1}, (_, i) => {
  const share = i * 0.5 / length
  return [start[0] + (end[0] - start[0]) * share, bastionMouth.floorY, start[1] + (end[1] - start[1]) * share] as const
}))
describe('the Fortress’ way from the Oculus up to the Forge', () => {
  test('its passages join end to end, from the doorway at the west bridge to the west arch of the Forge’s vestibule', () => {
    expect(bastionDoorway).toEqual({
      ...fortressDoorway,
      x: -fortressDoorway.x,
    })
    expect(bastionMouth.path[0]).toEqual([bastionDoorway.x, bastionDoorway.z])
    expect(route.start).toEqual(bastionMouth.path.at(-1)!)
    for (const [before, after] of [[bastionHairpin, bastionRun], [bastionRun, bastionApproach]] as const) {
      expect(before.route.end.point[0]).toBeCloseTo(after.route.start[0], 9)
      expect(before.route.end.point[1]).toBeCloseTo(after.route.start[1], 9)
      expect(before.route.end.heading).toBeCloseTo(after.route.heading, 9)
    }
    expect(route.end.heading).toBeCloseTo(-Math.PI / 2, 9)
    // Round its turn and straight east at the vestibule’s middle, up to where the plane touching its wall there crosses the line
    const [turn, strip] = bastionApproach.route.pieces
    expect([turn.kind, strip.kind]).toEqual(['arc', 'line'])
    expect(bastionApproach.route.end.point[0]).toBeCloseTo(forgeVestibule.center[0] - forgeVestibule.radius, 9)
    expect(bastionApproach.route.end.point[1]).toBeCloseTo(forgeVestibule.center[1], 9)
    expect(bastionApproach.route.end.heading).toBeCloseTo(0, 9)
    expect(strip.kind === 'line' && strip.start[1]).toBeCloseTo(forgeVestibule.center[1], 9)
    // From the west bridge’s end up to the Forge’s floor
    expect(bastionMouth.floorY).toBeCloseTo(tower.floorY + tower.height + towerBridge.rise, 9)
    expect(route.y).toBe(bastionMouth.floorY)
    expect(route.height).toBe(bastionMouth.height)
    expect(route.end.y).toBe(0)
    for (const passage of [bastionRun, bastionApproach]) {
      expect(passage.route.pieces.every(piece => piece.startY === 0 && piece.endY === 0 && piece.startHeight === 3.1 && piece.endHeight === 3.1)).toBe(true)
    }
    // As wide as the Fortress up to the screen wall, and narrower on to the vestibule
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
    for (const [x, y, z] of mouthPoints) {
      const position: Vec3 = [x, y + 1.6, z]
      expect(bastionMouth.floorAt(x, z)).toBe(y)
      expect(insideGallery(position)).toBe(true)
      expect(floorHeight(position)).toBeCloseTo(y, 6)
      expect(roomAt(position)).toBe('fortress')
    }
    for (const passage of routed) {
      for (const {point: [x, z], y} of along(passage)) {
        const position: Vec3 = [x, y + 1.6, z]
        expect(passage.floorAt(x, z)).toBeCloseTo(y, 6)
        expect(insideGallery(position)).toBe(true)
        expect(floorHeight(position)).toBeCloseTo(y, 6)
        expect(roomAt(position)).toBe('fortress')
      }
    }
    // Where the run crosses over the mouth, the floor under a player is the one they stand on.
    const [crossingX] = bastionRun.route.start
    const crossingZ = bastionDoorway.z
    expect(floorHeight([crossingX, 1.6, crossingZ])).toBe(0)
    expect(floorHeight([crossingX, bastionMouth.floorY + 1.6, crossingZ])).toBe(bastionMouth.floorY)
    expect(roomAt([crossingX, 1.6, crossingZ])).toBe('fortress')
    expect(roomAt([crossingX, bastionMouth.floorY + 1.6, crossingZ])).toBe('fortress')
    // Over the Lodge, the run is the Bastion’s and the room under it stays the Lodge’s.
    const overLodge: Vec3 = [crossingX, 1.6, lodge.center[1] + lodge.size[1] / 2 - 0.5]
    expect(roomAt(overLodge)).toBe('fortress')
    expect(roomAt([overLodge[0], lodge.floorY + 1.6, overLodge[2]])).toBe('lodge')
    expect(floorHeight(overLodge)).toBe(0)
  })
  test('the run north clears the Lodge’s roof, and the approach and the Forge’s vestibule the Fortress’ vaults, the approach keeping off the Forge’s walls', () => {
    // The Lodge’s ceiling slab tops out 24 cm over its height; the run’s and the approach’s paving hangs 24 cm under their floor.
    expect(bastionRun.route.y - 0.24).toBeGreaterThan(lodge.floorY + lodge.height + 0.24 + 0.3)
    // The Fortress’ air under the approach and the vestibule reaches up to the crowns of its vaults, whose shells stand 22 cm higher and whose slabs over them 24 cm.
    const {center: [vestibuleX, vestibuleZ], radius} = forgeVestibule
    const above = [...bastionApproach.chunks(0).map(({min, max}) => area([[min[0], min[2]], [max[0], max[2]]])), area([[vestibuleX - radius, vestibuleZ - radius], [vestibuleX + radius, vestibuleZ + radius]])]
    const below = slopGallery.room('fortress').air.filter(box => box.max.y < bastionApproach.route.y && above.some(region => region.intersectsBox(area([[box.min.x, box.min.z], [box.max.x, box.max.z]]))))
    expect(below.length).toBeGreaterThan(0)
    expect(Math.max(...below.map(box => box.max.y)) + Math.max(vaultShellThickness, 0.24) + 0.3).toBeLessThan(bastionApproach.route.y - 0.24)
    // All round its turn and along its strip, the approach’s walls keep clear of the Forge’s, their faces more than 30 cm apart.
    const [west, east] = [forge.center[0] - forge.size[0] / 2, forge.center[0] + forge.size[0] / 2]
    const [north, south] = [forge.center[1] - forge.size[1] / 2, forge.center[1] + forge.size[1] / 2]
    for (const station of along(bastionApproach)) {
      for (const side of [-1, 1]) {
        const reach = bastionApproach.reach(station, side)
        const [x, z] = [station.point[0] - Math.sin(station.heading) * side * reach, station.point[1] + Math.cos(station.heading) * side * reach]
        const apart = Math.hypot(Math.max(west - x, 0, x - east), Math.max(north - z, 0, z - south))
        expect(apart - wallFace * 2).toBeGreaterThan(0.3)
      }
    }
    // Behind the Forge’s west wall, the hairpin’s east leg keeps the Fortress’ clearance, and the turn stays off the Vesper’s.
    expect(west - (route.end.point[0] + bastionHairpin.width / 2)).toBeCloseTo(0.3, 9)
    const vesperWestX = vesper.center[0] - vesper.size[0] / 2
    for (const station of stations) {
      for (const side of [-1, 1]) {
        const reach = bastionHairpin.reach(station, side)
        expect(station.point[0] - Math.sin(station.heading) * side * reach).toBeLessThanOrEqual(vesperWestX - 0.3 + 1e-9)
      }
    }
  })
  test('beside the passages, behind their walls, lies neither the Bastion nor anything else', () => {
    for (const passage of routed) {
      for (const station of along(passage)) {
        const {point: [x, z], heading, y} = station
        for (const side of [-1, 1]) {
          const out = passage.reach(station, side) + 0.2
          const beside: Vec3 = [x - Math.sin(heading) * side * out, y + 1.6, z + Math.cos(heading) * side * out]
          expect(passage.floorAt(beside[0], beside[2])).toBeUndefined()
          // The approach begins in the screen wall’s arch, behind which the broad run ends, and its strip runs into the vestibule’s arch, where the Forge begins.
          if (passage !== bastionApproach || station.along > 0.3 && station.along < passage.route.length - 0.3) {
            expect(insideGallery(beside)).toBe(false)
          }
        }
      }
    }
  })
  test('the screen wall closes the broad run where the narrow approach begins, with an arch as wide and as high as the approach’s vault', () => {
    const screen = wallById('fortress-climb_screen')
    const [screenX, screenZ] = bastionRun.route.end.point
    expect(screen.center[0]).toBeCloseTo(screenX, 9)
    expect(screen.center[2]).toBeCloseTo(screenZ, 9)
    expect(screen.center[1]).toBe(0)
    expect(screen.width).toBe(bastionRun.width)
    expect(screen.height + 0.3).toBe(bastionRun.route.height)
    expect(screen.rotation).toBe(0)
    expect(screen.sticky).toBe(false)
    expect(screen.cornice).toBe(false)
    expect(screen.miters).toEqual([1, 1])
    expect(architecture.find(({wall}) => wall.id === 'fortress-climb_screen')!.geometry.cornice).toEqual([])
    expect([...bastionRun.walls, ...bastionApproach.walls].every(wall => wall.cornice === false)).toBe(true)
    expect(screen.holes).toEqual([{
      ...bastionArch,
      name: 'approach',
      u: 0,
    }])
    expect(bastionScreen).toMatchObject({
      id: 'fortress-climb_screen',
      room: 'fortress',
    })
    // Its arch is the approach’s section: the approach’s walls stand at its jambs, and its crown at the approach’s.
    const start = bastionApproach.route.at(0)
    expect([-1, 1].map(side => bastionApproach.reach(start, side))).toEqual([bastionArch.width / 2, bastionArch.width / 2])
    expect(bastionApproach.route.height).toBe(bastionArch.height)
    // Facing south down the run: half a meter in front of it lies the run’s floor, half a meter behind it the approach’s.
    const [frontX, , frontZ] = wallPosition(screen, 1.5, 0, 0.5)
    const [backX, , backZ] = wallPosition(screen, 0, 0, -0.5)
    expect(bastionRun.floorAt(frontX, frontZ)).toBe(0)
    expect(bastionApproach.floorAt(backX, backZ)).toBe(0)
    expect(bastionApproach.floorAt(frontX, frontZ)).toBeUndefined()
  })
  test('a runnel worn into the paving runs down the middle of the climb from the vestibule’s arch to the gate in the mouth, without a step between its passages', () => {
    // As deep and as wide where one passage hands over to the next, and at the gate’s hatch, it has shallowed out up to the floor.
    expect(bastionApproach.runnelShape(0)).toMatchObject({
      width: bastionRunnel.width,
      depth: 1,
      offset: 0,
    })
    expect(bastionRun.runnelShape(bastionRun.route.length)).toMatchObject({
      width: bastionRunnel.width,
      depth: 1,
      offset: 0,
    })
    expect(bastionRun.runnelShape(0).width).toBeCloseTo(bastionRunnel.width, 9)
    // Down the hairpin it is wider and deeper, a full half round, narrowing toward the hairpin’s top to meet the run’s.
    expect(bastionHairpin.runnelShape(route.length)).toMatchObject({
      width: bastionRunnel.width,
      depth: 1,
    })
    expect(bastionHairpin.runnelShape(0)).toMatchObject({
      width: bastionMouthRunnel.runnel.width,
      depth: 1,
    })
    expect(bastionHairpin.runnel!.width).toBe(bastionRunnel.radius * 2)
    expect(bastionRun.runnel!.width).toBeLessThan(bastionHairpin.runnel!.width)
    // Under the vestibule’s arch, it opens out into a broad mouth.
    expect(bastionApproach.runnelShape(bastionApproach.route.length).width).toBeGreaterThan(bastionRunnel.width * 2)
    // Round the hairpin’s turn, it swings out toward the outer wall and back onto the middle of both legs.
    expect(Math.abs(bastionHairpin.runnelShape(route.length / 2).offset)).toBeGreaterThan(0.5)
    expect(Math.abs(bastionHairpin.runnelShape(1).offset)).toBeLessThan(1e-3)
    expect(Math.abs(bastionHairpin.runnelShape(route.length - 1).offset)).toBeLessThan(1e-3)
    // From the hairpin’s foot on, straight across the mouth’s elbow, ending under the gate’s hatch.
    expect(bastionMouthRunnel.from).toEqual(route.start)
    const {hatch, wall} = fortressLinkGate
    expect(bastionMouthRunnel.to[0]).toBeCloseTo(wall.center[0] + hatch.u, 9)
    expect(bastionMouthRunnel.to[1]).toBeCloseTo(wall.center[2], 9)
    expect(bastionMouthRunnel.runnel.width).toBeLessThan(hatch.width - 0.1)
    const position = mouthGroove.getAttribute('position')
    let deepest = 0
    for (let i = 0; i < position.count; i++) {
      const depth = bastionMouth.floorY - position.getY(i)
      deepest = Math.max(deepest, depth)
      if (Math.abs(position.getZ(i) - bastionMouthRunnel.to[1]) < 1e-6) {
        expect(depth).toBeCloseTo(0, 6)
      }
    }
    expect(deepest).toBeGreaterThan(0.15)
    // Its strip is cut out of the mouth’s floors, which close round it.
    const cut = bastionMouth.floors.flatMap(floor => bastionMouthRunnel.cut(floor))
    const inStrip = (x: number, z: number) => cut.some(floor => insidePolygon(floor, x, z))
    expect(inStrip(bastionMouthRunnel.from[0], (bastionMouthRunnel.from[1] + bastionMouthRunnel.to[1]) / 2)).toBe(false)
    expect(inStrip(bastionMouthRunnel.from[0] + 0.4, (bastionMouthRunnel.from[1] + bastionMouthRunnel.to[1]) / 2)).toBe(true)
    expect(inStrip(bastionMouthRunnel.from[0] - 0.4, (bastionMouthRunnel.from[1] + bastionMouthRunnel.to[1]) / 2)).toBe(true)
    expect(inStrip((bastionDoorway.x + bastionMouthRunnel.from[0]) / 2, bastionDoorway.z)).toBe(true)
  })
  test('the doorways at both ends match the passages that lead through them', () => {
    const oculusWest = wallById('oculus-west')
    const bastion = oculusWest.holes!.find(hole => hole.name === 'fortress')!
    const fortress = wallById('oculus-east').holes!.find(hole => hole.name === 'fortress')!
    // The Fortress’ doorway mirrored: the same opening, measured the other way along its wall
    expect<typeof fortress>({
      ...bastion,
      name: 'fortress',
      u: -bastion.u,
    }).toEqual(fortress)
    expect(wallPosition(oculusWest, bastion.u, 0, 0)[2]).toBeCloseTo(bastionDoorway.z, 9)
    // The vestibule’s west arch, where the approach ends, spans as much straight across between its jambs as the approach’s arch, and is as high.
    const arch = vestibuleWall.holes!.find(hole => hole.name === 'fortress')!
    const [endX, endZ] = bastionApproach.route.end.point
    const [x, , z] = wallPosition(vestibuleWall, arch.u, 0, 0)
    expect(x).toBeCloseTo(endX, 9)
    expect(z).toBeCloseTo(endZ, 9)
    const jambs = [-1, 1].map(side => wallPosition(vestibuleWall, arch.u + side * arch.width / 2, 0, 0))
    expect(Math.abs(jambs[0][2] - jambs[1][2])).toBeCloseTo(bastionArch.width, 9)
    expect([arch.height, arch.profile]).toEqual([bastionArch.height, bastionArch.profile])
    expect(insideOpening(arch, wallCoordinates(vestibuleWall, [endX + 0.1, 0, endZ]), 1.7)).toBe(true)
    expect(roomAt([endX + 0.05, 1.7, endZ])).toBe('forge')
    expect(roomAt([endX - 0.05, 1.7, endZ])).toBe('fortress')
  })
  test('its lanterns hang between the hairpin’s ribs and its lamps under them', () => {
    for (const hung of Object.values(bastionLanterns)) {
      expect(bastionHairpin.ribs.some(rib => Math.abs(rib - hung) < 0.3)).toBe(false)
    }
    const ids = ['climb', 'elbow', 'mouth', 'run', 'strip', 'turn', 'west'].map(id => `fortress-lantern_${id}`)
    const lamps = slopGallery.room('fortress').lamps().filter(({id}) => ids.includes(id))
    expect(lamps.map(({id}) => id).toSorted()).toEqual(ids)
    for (const {position} of lamps) {
      expect(roomAt(position)).toBe('fortress')
      // Under the crown, over a person’s head
      expect(position[1] - floorHeight(position)).toBeGreaterThan(1.7)
      expect(position[1] - floorHeight(position)).toBeLessThan(2.3)
    }
  })
  for (const sprint of [false, true]) {
    for (const returning of [false, true]) {
      test(`a player walks from the west bridge through the doorway up the hairpin, round into the Forge’s vestibule and on into the Forge, sprint ${sprint}, returning ${returning}`, () => {
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
        for (const geometry of [ground, ...routeVaults.flatMap(vault => [vault.shell, vault.ribs]), mouthVault.shell, mouthVault.ribs, ...vestibuleParts]) {
          world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(geometry)))
        }
        // The paving and the mouth’s runnel welded, as the game builds them
        for (const geometry of [...routeVaults.map(vault => vault.paving), mouthGroove]) {
          const [vertices, indices] = colliderGeometry(geometry)
          world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices, RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES))
        }
        for (const floor of bastionMouth.floors.flatMap(piece => bastionMouthRunnel.cut(piece))) {
          world.createCollider(RAPIER.ColliderDesc.convexHull(slabCorners(floor, bastionMouth.floorY - 0.24, bastionMouth.floorY))!)
        }
        world.createCollider(RAPIER.ColliderDesc.cuboid(forge.size[0] / 2, 0.12, forge.size[1] / 2).setTranslation(forge.center[0], -0.12, forge.center[1]))
        addOculusRailings(world)
        const bridgeX = tower.x - 5
        const bridge = towerFloorHeight(bridgeX, tower.z)!
        // Through the doorway and round every elbow like a player, at a walk; the straight stretches at a sprint if asked.
        const path: Array<readonly [x: number, z: number, careful?: boolean]> = [
          [bridgeX, tower.z],
          [bastionDoorway.x - 0.6, tower.z, true],
          ...elbows,
          ...stations.filter((_, i) => i % 2 === 0).map(({point}) => point),
          ...[bastionRun, bastionApproach].flatMap(passage => along(passage).filter((_, i) => i % 2 === 0).map(({point}): readonly [number, number, boolean] => [...point, true])),
          // Through the vestibule’s middle and out through the arch in the Forge’s north wall
          [forgeVestibule.center[0], forgeVestibule.center[1], true],
          [forge.center[0], forge.center[1] - 3],
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

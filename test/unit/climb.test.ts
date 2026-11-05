import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import EgoMotor from 'ego-player/motor'
import {Box2, ExtrudeGeometry, Matrix4, Quaternion, Vector2, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry, wallFace} from '../../src/lib/gallery/architecture.ts'
import {vaultShellThickness} from '../../src/lib/gallery/architectureDimensions.ts'
import {bastionDoorway} from '../../src/lib/gallery/bastion.ts'
import {bastionLinkGate} from '../../src/lib/gallery/bastionNetwork.ts'
import {climbApproach, climbArch, climbDoorway, climbHairpin, climbLanterns, climbMouth, climbMouthRunnel, climbRun, climbRunnel, climbScreen} from '../../src/lib/gallery/climb.ts'
import {easedRampGradient} from '../../src/lib/gallery/easedRamp.ts'
import {insidePolygon, slabCorners} from '../../src/lib/gallery/floorPolygons.ts'
import forge, {forgeVestibule} from '../../src/lib/gallery/forge.ts'
import {forgeRoundVestibule, vestibuleArches} from '../../src/lib/gallery/forgeVestibule.ts'
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
const {route} = climbHairpin
/** the climb’s routed passages, from the hairpin up to the vestibule */
const routed = [climbHairpin, climbRun, climbApproach] as const
const routeVaults = routed.map(passage => new RouteVaultGeometry(passage))
const mouthVault = new VaultGeometry(climbMouth)
const mouthGroove = climbMouthRunnel.geometry()
const ground = new OculusGroundGeometry
const wallById = (id: string) => walls.find(wall => wall.id === id)!
const architecture = walls.filter(wall => wall.room === 'bastion' || ['forge-north', 'forge-vestibule', 'oculus-west'].includes(wall.id)).map(wall => ({
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
    const reveal = roundRevealGeometry(vestibuleWall, vestibuleWall.holes!.find(hole => hole.name === name)!, climbArch)
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
const elbows = climbMouth.path.slice(1).map(([x, z]): readonly [number, number, boolean] => [x, z, true])
/** the rectangle on the floor plan round the points, in x and z */
const area = (points: ReadonlyArray<readonly [number, number]>) => {
  const box = new Box2
  return box.setFromPoints(points.map(([x, z]) => new Vector2(x, z)))
}
/** stations every half meter along a routed passage’s center line */
const along = (passage: typeof routed[number]) => Array.from({length: Math.floor(passage.route.length / 0.5) + 1}, (_, i) => passage.route.at(i * 0.5))
/** points every half meter along the mouth’s center line, with its floor height */
const mouthPoints = climbMouth.spans.flatMap(({start, end, length}) => Array.from({length: Math.floor(length / 0.5) + 1}, (_, i) => {
  const share = i * 0.5 / length
  return [start[0] + (end[0] - start[0]) * share, climbMouth.floorY, start[1] + (end[1] - start[1]) * share] as const
}))
describe('the Bastion’s way from the Oculus up to the Forge', () => {
  test('its passages join end to end, from the doorway at the west bridge to the west arch of the Forge’s vestibule', () => {
    expect(climbDoorway).toEqual({
      ...bastionDoorway,
      x: -bastionDoorway.x,
    })
    expect(climbMouth.path[0]).toEqual([climbDoorway.x, climbDoorway.z])
    expect(route.start).toEqual(climbMouth.path.at(-1)!)
    for (const [before, after] of [[climbHairpin, climbRun], [climbRun, climbApproach]] as const) {
      expect(before.route.end.point[0]).toBeCloseTo(after.route.start[0], 9)
      expect(before.route.end.point[1]).toBeCloseTo(after.route.start[1], 9)
      expect(before.route.end.heading).toBeCloseTo(after.route.heading, 9)
    }
    expect(route.end.heading).toBeCloseTo(-Math.PI / 2, 9)
    // Round its turn and straight east at the vestibule’s middle, up to where the plane touching its wall there crosses the line
    const [turn, strip] = climbApproach.route.pieces
    expect([turn.kind, strip.kind]).toEqual(['arc', 'line'])
    expect(climbApproach.route.end.point[0]).toBeCloseTo(forgeVestibule.center[0] - forgeVestibule.radius, 9)
    expect(climbApproach.route.end.point[1]).toBeCloseTo(forgeVestibule.center[1], 9)
    expect(climbApproach.route.end.heading).toBeCloseTo(0, 9)
    expect(strip.kind === 'line' && strip.start[1]).toBeCloseTo(forgeVestibule.center[1], 9)
    // From the west bridge’s end up to the Forge’s floor
    expect(climbMouth.floorY).toBeCloseTo(tower.floorY + tower.height + towerBridge.rise, 9)
    expect(route.y).toBe(climbMouth.floorY)
    expect(route.height).toBe(climbMouth.height)
    expect(route.end.y).toBe(0)
    for (const passage of [climbRun, climbApproach]) {
      expect(passage.route.pieces.every(piece => piece.startY === 0 && piece.endY === 0 && piece.startHeight === 3.1 && piece.endHeight === 3.1)).toBe(true)
    }
    // As wide as the Bastion up to the screen wall, and narrower on to the vestibule
    expect([climbMouth.width, climbHairpin.width, climbRun.width]).toEqual([4, 4, 4])
    expect(climbApproach.width).toBe(2.6)
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
    expect([ramp.startY, ramp.endY]).toEqual([climbMouth.floorY, 0])
    expect(Math.abs(slope(0.02))).toBeLessThan(0.025)
    expect(Math.abs(slope(route.length - 0.02))).toBeLessThan(0.025)
    expect((0 - climbMouth.floorY) * easedRampGradient(route.length / 2, route.length)).toBeCloseTo(0.25, 9)
    let previous = climbMouth.floorY
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
      expect(climbMouth.floorAt(x, z)).toBe(y)
      expect(insideGallery(position)).toBe(true)
      expect(floorHeight(position)).toBeCloseTo(y, 6)
      expect(roomAt(position)).toBe('bastion')
    }
    for (const passage of routed) {
      for (const {point: [x, z], y} of along(passage)) {
        const position: Vec3 = [x, y + 1.6, z]
        expect(passage.floorAt(x, z)).toBeCloseTo(y, 6)
        expect(insideGallery(position)).toBe(true)
        expect(floorHeight(position)).toBeCloseTo(y, 6)
        expect(roomAt(position)).toBe('bastion')
      }
    }
    // Where the run crosses over the mouth, the floor under a player is the one they stand on.
    const [crossingX] = climbRun.route.start
    const crossingZ = climbDoorway.z
    expect(floorHeight([crossingX, 1.6, crossingZ])).toBe(0)
    expect(floorHeight([crossingX, climbMouth.floorY + 1.6, crossingZ])).toBe(climbMouth.floorY)
    expect(roomAt([crossingX, 1.6, crossingZ])).toBe('bastion')
    expect(roomAt([crossingX, climbMouth.floorY + 1.6, crossingZ])).toBe('bastion')
    // Over the Lodge, the run is the climb’s and the room under it stays the Lodge’s.
    const overLodge: Vec3 = [crossingX, 1.6, lodge.center[1] + lodge.size[1] / 2 - 0.5]
    expect(roomAt(overLodge)).toBe('bastion')
    expect(roomAt([overLodge[0], lodge.floorY + 1.6, overLodge[2]])).toBe('lodge')
    expect(floorHeight(overLodge)).toBe(0)
  })
  test('the run north clears the Lodge’s roof, and the approach and the Forge’s vestibule the Bastion’s vaults, the approach keeping off the Forge’s walls', () => {
    // The Lodge’s ceiling slab tops out 24 cm over its height; the run’s and the approach’s paving hangs 24 cm under their floor.
    expect(climbRun.route.y - 0.24).toBeGreaterThan(lodge.floorY + lodge.height + 0.24 + 0.3)
    // The Bastion’s air under the approach and the vestibule reaches up to the crowns of its vaults, whose shells stand 22 cm higher and whose slabs over them 24 cm.
    const {center: [vestibuleX, vestibuleZ], radius} = forgeVestibule
    const above = [...climbApproach.chunks(0).map(({min, max}) => area([[min[0], min[2]], [max[0], max[2]]])), area([[vestibuleX - radius, vestibuleZ - radius], [vestibuleX + radius, vestibuleZ + radius]])]
    const below = slopGallery.room('bastion').air.filter(box => box.max.y < climbApproach.route.y && above.some(region => region.intersectsBox(area([[box.min.x, box.min.z], [box.max.x, box.max.z]]))))
    expect(below.length).toBeGreaterThan(0)
    expect(Math.max(...below.map(box => box.max.y)) + Math.max(vaultShellThickness, 0.24) + 0.3).toBeLessThan(climbApproach.route.y - 0.24)
    // All round its turn and along its strip, the approach’s walls keep clear of the Forge’s, their faces more than 30 cm apart.
    const [west, east] = [forge.center[0] - forge.size[0] / 2, forge.center[0] + forge.size[0] / 2]
    const [north, south] = [forge.center[1] - forge.size[1] / 2, forge.center[1] + forge.size[1] / 2]
    for (const station of along(climbApproach)) {
      for (const side of [-1, 1]) {
        const reach = climbApproach.reach(station, side)
        const [x, z] = [station.point[0] - Math.sin(station.heading) * side * reach, station.point[1] + Math.cos(station.heading) * side * reach]
        const apart = Math.hypot(Math.max(west - x, 0, x - east), Math.max(north - z, 0, z - south))
        expect(apart - wallFace * 2).toBeGreaterThan(0.3)
      }
    }
    // Behind the Forge’s west wall, the hairpin’s east leg keeps the Bastion’s clearance, and the turn stays off the Vesper’s.
    expect(west - (route.end.point[0] + climbHairpin.width / 2)).toBeCloseTo(0.3, 9)
    const vesperWestX = vesper.center[0] - vesper.size[0] / 2
    for (const station of stations) {
      for (const side of [-1, 1]) {
        const reach = climbHairpin.reach(station, side)
        expect(station.point[0] - Math.sin(station.heading) * side * reach).toBeLessThanOrEqual(vesperWestX - 0.3 + 1e-9)
      }
    }
  })
  test('beside the passages, behind their walls, lies neither the climb nor anything else', () => {
    for (const passage of routed) {
      for (const station of along(passage)) {
        const {point: [x, z], heading, y} = station
        for (const side of [-1, 1]) {
          const out = passage.reach(station, side) + 0.2
          const beside: Vec3 = [x - Math.sin(heading) * side * out, y + 1.6, z + Math.cos(heading) * side * out]
          expect(passage.floorAt(beside[0], beside[2])).toBeUndefined()
          // The approach begins in the screen wall’s arch, behind which the broad run ends, and its strip runs into the vestibule’s arch, where the Forge begins.
          if (passage !== climbApproach || station.along > 0.3 && station.along < passage.route.length - 0.3) {
            expect(insideGallery(beside)).toBe(false)
          }
        }
      }
    }
  })
  test('the screen wall closes the broad run where the narrow approach begins, with an arch as wide and as high as the approach’s vault', () => {
    const screen = wallById('bastion-climb_screen')
    const [screenX, screenZ] = climbRun.route.end.point
    expect(screen.center[0]).toBeCloseTo(screenX, 9)
    expect(screen.center[2]).toBeCloseTo(screenZ, 9)
    expect(screen.center[1]).toBe(0)
    expect(screen.width).toBe(climbRun.width)
    expect(screen.height + 0.3).toBe(climbRun.route.height)
    expect(screen.rotation).toBe(0)
    expect(screen.sticky).toBe(false)
    expect(screen.cornice).toBe(false)
    expect(screen.miters).toEqual([1, 1])
    expect(architecture.find(({wall}) => wall.id === 'bastion-climb_screen')!.geometry.cornice).toEqual([])
    expect([...climbRun.walls, ...climbApproach.walls].every(wall => wall.cornice === false)).toBe(true)
    expect(screen.holes).toEqual([{
      ...climbArch,
      name: 'approach',
      u: 0,
    }])
    expect(climbScreen).toMatchObject({
      id: 'bastion-climb_screen',
      room: 'bastion',
    })
    // Its arch is the approach’s section: the approach’s walls stand at its jambs, and its crown at the approach’s.
    const start = climbApproach.route.at(0)
    expect([-1, 1].map(side => climbApproach.reach(start, side))).toEqual([climbArch.width / 2, climbArch.width / 2])
    expect(climbApproach.route.height).toBe(climbArch.height)
    // Facing south down the run: half a meter in front of it lies the run’s floor, half a meter behind it the approach’s.
    const [frontX, , frontZ] = wallPosition(screen, 1.5, 0, 0.5)
    const [backX, , backZ] = wallPosition(screen, 0, 0, -0.5)
    expect(climbRun.floorAt(frontX, frontZ)).toBe(0)
    expect(climbApproach.floorAt(backX, backZ)).toBe(0)
    expect(climbApproach.floorAt(frontX, frontZ)).toBeUndefined()
  })
  test('a runnel worn into the paving runs down the middle of the climb from the vestibule’s arch to the gate in the mouth, without a step between its passages', () => {
    // As deep and as wide where one passage hands over to the next, and at the gate’s hatch, it has shallowed out up to the floor.
    expect(climbApproach.runnelShape(0)).toMatchObject({
      width: climbRunnel.width,
      depth: 1,
      offset: 0,
    })
    expect(climbRun.runnelShape(climbRun.route.length)).toMatchObject({
      width: climbRunnel.width,
      depth: 1,
      offset: 0,
    })
    expect(climbRun.runnelShape(0).width).toBeCloseTo(climbRunnel.width, 9)
    // Down the hairpin it is wider and deeper, a full half round, narrowing toward the hairpin’s top to meet the run’s.
    expect(climbHairpin.runnelShape(route.length)).toMatchObject({
      width: climbRunnel.width,
      depth: 1,
    })
    expect(climbHairpin.runnelShape(0)).toMatchObject({
      width: climbMouthRunnel.runnel.width,
      depth: 1,
    })
    expect(climbHairpin.runnel!.width).toBe(climbRunnel.radius * 2)
    expect(climbRun.runnel!.width).toBeLessThan(climbHairpin.runnel!.width)
    // Under the vestibule’s arch, it opens out into a broad mouth.
    expect(climbApproach.runnelShape(climbApproach.route.length).width).toBeGreaterThan(climbRunnel.width * 2)
    // Round the hairpin’s turn, it swings out toward the outer wall and back onto the middle of both legs.
    expect(Math.abs(climbHairpin.runnelShape(route.length / 2).offset)).toBeGreaterThan(0.5)
    expect(Math.abs(climbHairpin.runnelShape(1).offset)).toBeLessThan(1e-3)
    expect(Math.abs(climbHairpin.runnelShape(route.length - 1).offset)).toBeLessThan(1e-3)
    // From the hairpin’s foot on, straight across the mouth’s elbow, ending under the gate’s hatch.
    expect(climbMouthRunnel.from).toEqual(route.start)
    const {hatch, wall} = bastionLinkGate
    expect(climbMouthRunnel.to[0]).toBeCloseTo(wall.center[0] + hatch.u, 9)
    expect(climbMouthRunnel.to[1]).toBeCloseTo(wall.center[2], 9)
    expect(climbMouthRunnel.runnel.width).toBeLessThan(hatch.width - 0.1)
    const position = mouthGroove.getAttribute('position')
    let deepest = 0
    for (let i = 0; i < position.count; i++) {
      const depth = climbMouth.floorY - position.getY(i)
      deepest = Math.max(deepest, depth)
      if (Math.abs(position.getZ(i) - climbMouthRunnel.to[1]) < 1e-6) {
        expect(depth).toBeCloseTo(0, 6)
      }
    }
    expect(deepest).toBeGreaterThan(0.15)
    // Its strip is cut out of the mouth’s floors, which close round it.
    const cut = climbMouth.floors.flatMap(floor => climbMouthRunnel.cut(floor))
    const inStrip = (x: number, z: number) => cut.some(floor => insidePolygon(floor, x, z))
    expect(inStrip(climbMouthRunnel.from[0], (climbMouthRunnel.from[1] + climbMouthRunnel.to[1]) / 2)).toBe(false)
    expect(inStrip(climbMouthRunnel.from[0] + 0.4, (climbMouthRunnel.from[1] + climbMouthRunnel.to[1]) / 2)).toBe(true)
    expect(inStrip(climbMouthRunnel.from[0] - 0.4, (climbMouthRunnel.from[1] + climbMouthRunnel.to[1]) / 2)).toBe(true)
    expect(inStrip((climbDoorway.x + climbMouthRunnel.from[0]) / 2, climbDoorway.z)).toBe(true)
  })
  test('the doorways at both ends match the passages that lead through them', () => {
    const oculusWest = wallById('oculus-west')
    const climb = oculusWest.holes!.find(hole => hole.name === 'bastion')!
    const bastion = wallById('oculus-east').holes!.find(hole => hole.name === 'bastion')!
    // The Bastion’s doorway mirrored: the same opening, measured the other way along its wall
    expect<typeof bastion>({
      ...climb,
      name: 'bastion',
      u: -climb.u,
    }).toEqual(bastion)
    expect(wallPosition(oculusWest, climb.u, 0, 0)[2]).toBeCloseTo(climbDoorway.z, 9)
    // The vestibule’s west arch, where the approach ends, spans as much straight across between its jambs as the approach’s arch, and is as high.
    const arch = vestibuleWall.holes!.find(hole => hole.name === 'bastion')!
    const [endX, endZ] = climbApproach.route.end.point
    const [x, , z] = wallPosition(vestibuleWall, arch.u, 0, 0)
    expect(x).toBeCloseTo(endX, 9)
    expect(z).toBeCloseTo(endZ, 9)
    const jambs = [-1, 1].map(side => wallPosition(vestibuleWall, arch.u + side * arch.width / 2, 0, 0))
    expect(Math.abs(jambs[0][2] - jambs[1][2])).toBeCloseTo(climbArch.width, 9)
    expect([arch.height, arch.profile]).toEqual([climbArch.height, climbArch.profile])
    expect(insideOpening(arch, wallCoordinates(vestibuleWall, [endX + 0.1, 0, endZ]), 1.7)).toBe(true)
    expect(roomAt([endX + 0.05, 1.7, endZ])).toBe('forge')
    expect(roomAt([endX - 0.05, 1.7, endZ])).toBe('bastion')
  })
  test('its lanterns hang between the hairpin’s ribs and its lamps under them', () => {
    for (const hung of Object.values(climbLanterns)) {
      expect(climbHairpin.ribs.some(rib => Math.abs(rib - hung) < 0.3)).toBe(false)
    }
    const ids = ['climb', 'elbow', 'mouth', 'run', 'strip', 'turn', 'west'].map(id => `bastion-lantern_${id}`)
    const lamps = slopGallery.room('bastion').lamps().filter(({id}) => ids.includes(id))
    expect(lamps.map(({id}) => id).toSorted()).toEqual(ids)
    for (const {position} of lamps) {
      expect(roomAt(position)).toBe('bastion')
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
        for (const floor of climbMouth.floors.flatMap(piece => climbMouthRunnel.cut(piece))) {
          world.createCollider(RAPIER.ColliderDesc.convexHull(slabCorners(floor, climbMouth.floorY - 0.24, climbMouth.floorY))!)
        }
        world.createCollider(RAPIER.ColliderDesc.cuboid(forge.size[0] / 2, 0.12, forge.size[1] / 2).setTranslation(forge.center[0], -0.12, forge.center[1]))
        addOculusRailings(world)
        const bridgeX = tower.x - 5
        const bridge = towerFloorHeight(bridgeX, tower.z)!
        // Through the doorway and round every elbow like a player, at a walk; the straight stretches at a sprint if asked.
        const path: Array<readonly [x: number, z: number, careful?: boolean]> = [
          [bridgeX, tower.z],
          [climbDoorway.x - 0.6, tower.z, true],
          ...elbows,
          ...stations.filter((_, i) => i % 2 === 0).map(({point}) => point),
          ...[climbRun, climbApproach].flatMap(passage => along(passage).filter((_, i) => i % 2 === 0).map(({point}): readonly [number, number, boolean] => [...point, true])),
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

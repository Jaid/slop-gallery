import type {PedestalLobe} from '../../src/lib/gallery/DisplayPedestalGeometry.ts'

import {expect, test} from 'bun:test'

import {common, ethereal, knots, prime, rare} from 'knot-materials'
import {createKnotGeometry} from 'knot-materials/geometry.ts'
import {knotSign, knotSignParts, knotSignRoundParts} from 'knot-materials/signs.ts'
import {DoubleSide, Euler, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {environmentWeightedPick} from '../../src/lib/environmentSeed.ts'
import {wallFace} from '../../src/lib/gallery/architectureDimensions.ts'
import DisplayPedestalGeometry, {pedestalOverhang} from '../../src/lib/gallery/DisplayPedestalGeometry.ts'
import lowerGallery, {tunnelFloorHeight, tunnelSlope} from '../../src/lib/gallery/lowerGallery.ts'
import tunnelDisplays, {displayNorthExtension, tunnelDisplayWindow} from '../../src/lib/gallery/tunnelDisplays.ts'
import exhibitionKnots, {exhibitionKnotOffset, exhibitionPedestal, exhibitionPedestalLobes, exhibitionRarityChances, exhibitionSidecar, exhibitionSlots} from '../../src/rooms/exhibition/knots.ts'
import salonKnot from '../../src/rooms/salon/knot.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'

const displayOf = (slot: (typeof exhibitionSlots)[number]) => tunnelDisplays.find(display => display.exhibits.some(exhibit => exhibit.id === slot.id))!
const seeds = Array.from({length: 4000}, (_, seed) => seed)
test('weighted picks follow their weights and depend only on seed and ID', () => {
  const counts = new Map<string, number>
  for (const seed of seeds) {
    const pick = environmentWeightedPick(seed, 'weighted', [['a', 3], ['b', 1], ['never', 0]])
    counts.set(pick, (counts.get(pick) ?? 0) + 1)
  }
  expect(counts.get('never')).toBeUndefined()
  expect(counts.get('a')! / seeds.length).toBeCloseTo(0.75, 1)
  expect(environmentWeightedPick(9, 'weighted', [['a', 1], ['b', 1]])).toBe(environmentWeightedPick(9, 'weighted', [['a', 1], ['b', 1]]))
  expect(() => environmentWeightedPick(1, 'empty', [])).toThrow()
  expect(() => environmentWeightedPick(1, 'weightless', [['a', 0]])).toThrow()
  expect(() => environmentWeightedPick(1, 'negative', [['a', 2], ['b', -1]])).toThrow()
})
test('the seed alone picks six distinct Knots, never the Salon’s, rolling the rarity first', () => {
  expect(exhibitionRarityChances.reduce((sum, [, chance]) => sum + chance, 0)).toBeCloseTo(1, 9)
  expect(exhibitionKnots(7).map(knot => knot.entry.id)).toEqual(exhibitionKnots(7).map(knot => knot.entry.id))
  const rarities = new Map<number, number>
  for (const seed of seeds) {
    const picks = exhibitionKnots(seed)
    expect(picks).toHaveLength(6)
    const ids = new Set(picks.map(knot => knot.entry.id))
    expect(ids.size).toBe(6)
    expect(ids.has(salonKnot(seed).id)).toBe(false)
    for (const {entry} of picks) {
      rarities.set(entry.rarity, (rarities.get(entry.rarity) ?? 0) + 1)
    }
  }
  const total = seeds.length * 6
  expect(rarities.keys().toArray().toSorted((a, b) => a - b)).toEqual([common, rare, prime, ethereal])
  for (const [rarity, chance] of exhibitionRarityChances) {
    expect(Math.abs(rarities.get(rarity)! / total - chance)).toBeLessThan(0.015)
  }
  const distinct = new Set(seeds.flatMap(seed => exhibitionKnots(seed).map(knot => knot.entry.id)))
  expect(distinct.size).toBeGreaterThan(knots.length / 2)
})
test('every Knot floats inside its display in full view of the window, clear of its pedestal, the ceiling and the walls', () => {
  const geometry = createKnotGeometry()
  const bounds = geometry.boundingBox!
  const positions = geometry.getAttribute('position')
  let reach = 0
  for (let i = 0; i < positions.count; i++) {
    reach = Math.max(reach, Math.hypot(positions.getX(i), positions.getZ(i)))
  }
  geometry.dispose()
  const displacement = Math.max(...knots.map(knot => knot.displacement ?? 0))
  expect(exhibitionSlots).toHaveLength(6)
  for (const slot of exhibitionSlots) {
    const display = displayOf(slot)
    const [x, y, z] = slot.position
    const floor = tunnelFloorHeight(z)
    expect(slot.pedestal).toEqual([display.backX, floor, z])
    expect(slopGallery.roomAt([x, y, z])?.id).toBe('exhibition')
    // Turning only around the vertical, the Knot keeps its lowest and highest point however far it turned.
    const bottom = y + bounds.min.y - displacement
    const top = y + bounds.max.y + displacement
    expect(bottom - (floor + exhibitionPedestal.height)).toBeGreaterThan(0.15)
    expect(y + bounds.min.y - floor).toBeGreaterThan(tunnelDisplayWindow.bottom)
    expect(y + bounds.max.y - floor).toBeLessThan(tunnelDisplayWindow.top)
    // The floor and the ceiling slope, so they come closest at the end of the Knot’s reach.
    expect(tunnelFloorHeight(z + reach + displacement) + lowerGallery.tunnel.height - top).toBeGreaterThan(0.5)
    // It floats over its pedestal, clear of the back wall and the window.
    expect(exhibitionKnotOffset).toBeLessThan(exhibitionPedestal.length + exhibitionPedestal.radius - 0.3)
    expect(exhibitionKnotOffset - reach - displacement).toBeGreaterThan(0.1)
    expect(display.size[0] - wallFace - exhibitionKnotOffset - reach - displacement).toBeGreaterThan(0.5)
    expect(display.size[1] / 2 - Math.abs(z - display.center[1]) - reach - displacement).toBeGreaterThan(0.4)
  }
})
test('the pedestals back onto the back walls with their sidecars, leaving ways in from the cutouts and along the windows', () => {
  const [sidecar, main] = exhibitionPedestalLobes
  const northReach = -sidecar.z + sidecar.radius + pedestalOverhang
  const southReach = main.radius + pedestalOverhang
  const depth = main.length + main.radius + pedestalOverhang
  // The Knot floats over the middle of its pedestal’s depth.
  expect(Math.abs(exhibitionKnotOffset - depth / 2)).toBeLessThan(0.15)
  // The sidecar merges into the pedestal’s straight flank, and its nameplate’s stand rests on it clear of the pedestal.
  expect(main.z - main.radius - sidecar.z).toBeLessThan(sidecar.radius - 0.2)
  expect(main.z - main.radius - sidecar.z).toBeGreaterThan(0.2)
  // Where it meets the pedestal’s north flank, the sidecar’s top lies two thirds up from the course there to the pedestal’s top.
  const flankCourse = exhibitionPedestal.plinth + tunnelSlope * (main.z - main.radius)
  const sidecarTop = sidecar.height + tunnelSlope * sidecar.z
  expect((sidecarTop - flankCourse) / (main.height - flankCourse)).toBeCloseTo(2 / 3, 9)
  const base = knotSignRoundParts.find(part => part.height === 0.028)!
  // the stand’s foot inside the sidecar’s flanks and round end
  expect(exhibitionSidecar.signShift + base.radius).toBeLessThan(sidecar.radius)
  expect(Math.hypot(Math.max(0, exhibitionSidecar.signOffset + base.radius - sidecar.length), exhibitionSidecar.signShift + base.radius)).toBeLessThan(sidecar.radius)
  expect(sidecar.z - exhibitionSidecar.signShift + base.radius).toBeLessThan(main.z - main.radius - pedestalOverhang)
  for (const slot of exhibitionSlots) {
    const display = displayOf(slot)
    const south = display.center[1] + display.size[1] / 2
    const north = display.center[1] - display.size[1] / 2
    const [, , z] = slot.position
    expect(z - northReach - north).toBeGreaterThan(0.5)
    // The way in from the cutout in the south end wall runs along the wall past the southern pedestal.
    expect(south - z - southReach).toBeGreaterThan(0.9)
    // A visitor of 30 cm half-width passes between the pedestals and the window.
    expect(display.size[0] - wallFace - depth).toBeGreaterThan(0.62)
    // The nameplate stands on its sidecar’s cap, faces the window and stays clear of its Knot.
    const [signX, signY, signZ] = slot.sign.position
    expect(signZ).toBeCloseTo(z + sidecar.z - exhibitionSidecar.signShift, 9)
    expect(Math.abs(signX - display.backX)).toBeCloseTo(exhibitionSidecar.signOffset, 9)
    // The sidecar’s cap is level at its height over the floor under its middle.
    expect(signY - knotSign.elevation).toBeCloseTo(tunnelFloorHeight(z + sidecar.z) + sidecar.height, 9)
    // It faces out toward the window, the lowest down the tunnel toward the Oculus, to the north, the middle one straight and the highest up the tunnel toward Moonfall, to the south.
    const turn = [-1, 0, 1][display.exhibits.findIndex(exhibit => exhibit.id === slot.id)] * exhibitionSidecar.signTurn
    const facing = new Vector3(0, 0, 1)
    facing.applyAxisAngle(new Vector3(0, 1, 0), slot.sign.rotation)
    expect(facing.x * slot.direction).toBeCloseTo(Math.cos(turn), 9)
    expect(facing.z).toBeCloseTo(Math.sin(turn), 9)
    // Every corner of its plaque, which leans back, stays off the back wall, and either north of the pedestal or over its cap.
    const capTop = slot.pedestal[1] + main.height
    const [plaque] = knotSignParts
    for (const corner of [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(zSide => new Vector3(x * plaque.size[0] / 2, y * plaque.size[1] / 2, zSide * plaque.size[2] / 2))))) {
      corner.applyEuler(new Euler(...plaque.rotation!)).add(new Vector3(...plaque.position)).applyAxisAngle(new Vector3(0, 1, 0), slot.sign.rotation).add(new Vector3(...slot.sign.position))
      expect(Math.abs(corner.x - display.backX)).toBeGreaterThan(0.08)
      expect(corner.z < z - southReach - 0.1 || corner.y > capTop + 0.03).toBe(true)
      expect(Math.hypot(corner.x - slot.position[0], corner.z - z)).toBeGreaterThan(1.2)
    }
  }
  expect(new Set(exhibitionSlots.map(slot => slot.label))).toEqual(new Set(['#01', '#02', '#03', '#04', '#05', '#06']))
  // The displays reach past their windows’ north ends, behind the tunnel’s wall.
  for (const display of tunnelDisplays) {
    expect(display.size[1]).toBeCloseTo(tunnelDisplayWindow.width + displayNorthExtension, 9)
  }
})
test('a pedestal’s course follows the sloping floor around both lobes, while their caps stay level, flush with the wall behind it', () => {
  const [sidecar, main] = exhibitionPedestalLobes
  for (const direction of [-1, 1] as const) {
    const geometry = new DisplayPedestalGeometry({
      direction,
      lobes: exhibitionPedestalLobes,
      plinth: exhibitionPedestal.plinth,
      slope: tunnelSlope,
    })
    const material = new MeshBasicMaterial({side: DoubleSide})
    const meshes = [geometry.stone, geometry.reveal, geometry.cap].map(part => new Mesh(part, material))
    const down = (x: number, z: number) => {
      const ray = new Raycaster(new Vector3(direction * x, 3, z), new Vector3(0, -1, 0))
      return ray.intersectObjects(meshes)
    }
    try {
      const stone = geometry.stone.boundingBox!
      expect(Math.min(direction * stone.min.x, direction * stone.max.x)).toBeCloseTo(0, 6)
      expect(Math.max(direction * stone.min.x, direction * stone.max.x)).toBeCloseTo(main.length + main.radius + pedestalOverhang, 3)
      expect(stone.max.z).toBeCloseTo(main.radius + pedestalOverhang, 3)
      expect(stone.min.z).toBeCloseTo(sidecar.z - sidecar.radius - pedestalOverhang, 3)
      // Each lobe’s cap is level at its height over the floor under its middle.
      for (const lobe of [sidecar, main]) {
        for (const along of [-0.3, 0, 0.3]) {
          expect(down(0.2, lobe.z + along * lobe.radius)[0].point.y).toBeCloseTo(lobe.height + tunnelSlope * lobe.z, 3)
        }
      }
      // Wherever the course runs, the stone sits on the sloping floor.
      for (const z of [sidecar.z - sidecar.radius, sidecar.z, (sidecar.z + main.z - main.radius) / 2, -1, 0, 1, main.radius]) {
        expect(down(0.1, z).at(-1)!.point.y).toBeCloseTo(-0.02 + z * tunnelSlope, 2)
      }
      // Where the lobes meet, the course runs on without a gap, and out past the sidecar there is none.
      const seamZ = sidecar.z + sidecar.radius * 0.8
      expect(down(sidecar.radius * 0.5, seamZ).length).toBeGreaterThan(0)
      expect(down(sidecar.length + sidecar.radius + pedestalOverhang + 0.05, sidecar.z)).toHaveLength(0)
      expect(down(sidecar.length + sidecar.radius + pedestalOverhang - 0.05, sidecar.z).length).toBeGreaterThan(0)
      for (const part of [geometry.stone, geometry.reveal, geometry.cap]) {
        expect([...part.getAttribute('normal').array].every(Number.isFinite)).toBe(true)
      }
      expect(geometry.collision).toHaveLength(3)
    } finally {
      material.dispose()
      geometry.dispose()
    }
  }
  // too low for the slope, apart, out of order, one inside the other, flanks into the wall
  const invalid: Array<Array<PedestalLobe>> = [
    [{
      z: 0,
      radius: 3,
      height: 0.3,
    }],
    [{
      z: 0,
      radius: 1,
      height: 1,
    }, {
      z: 3,
      radius: 1,
      height: 1,
    }],
    [{
      z: 1,
      radius: 1,
      height: 1,
    }, {
      z: 0,
      radius: 1,
      height: 1,
    }],
    [{
      z: 0,
      radius: 1.5,
      length: 1,
      height: 1,
    }, {
      z: 0.2,
      radius: 0.3,
      height: 0.5,
    }],
    [{
      z: 0,
      radius: 1,
      length: -0.5,
      height: 1,
    }],
  ]
  for (const lobes of invalid) {
    expect(() => new DisplayPedestalGeometry({
      lobes,
      plinth: 0.1,
      slope: tunnelSlope,
    })).toThrow(RangeError)
  }
})

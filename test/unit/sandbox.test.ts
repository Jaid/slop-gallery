import type {Vec3} from '../../src/lib/gallery/types.ts'

import {describe, expect, test} from 'bun:test'

import {knotLightHousingSize, knotLightHousingY} from 'knot-materials/KnotLightPanels.ts'

import {architectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {wallFace} from '../../src/lib/gallery/architectureDimensions.ts'
import CellCeilingGeometry, {cellCeilingSlab, cellCoffers, cellLedY, cofferLine} from '../../src/lib/gallery/CellCeilingGeometry.ts'
import CellDoorGeometry from '../../src/lib/gallery/CellDoorGeometry.ts'
import withOpeningReveals from '../../src/lib/gallery/openingReveals.ts'
import {orbs} from '../../src/lib/gallery/orbs/index.ts'
import {pedestalHeight} from '../../src/lib/gallery/PedestalGeometry.ts'
import readQueryOverrides from '../../src/lib/queryOverrides.ts'
import cellBaseboard from '../../src/rooms/cell/baseboard.ts'
import Cell, {alcoveLight, cellLed} from '../../src/rooms/cell/Cell.ts'
import CellLayout from '../../src/rooms/cell/CellLayout.ts'
import cellMap from '../../src/rooms/cell/map.ts'
import RoomMap from '../../src/rooms/lib/RoomMap.ts'
import {readItems} from '../../src/worlds/sandbox/items.ts'
import Sandbox from '../../src/worlds/sandbox/Sandbox.ts'

const ids = orbs.map(orb => orb.propId)
/** the footprint of a pedestal, which no other may come closer to, middle to middle, than its diagonal */
const pedestalDiagonal = 1.16 * Math.SQRT2
const distance = ([ax, az]: readonly [number, number], [bx, bz]: readonly [number, number]) => Math.hypot(ax - bx, az - bz)
describe('?item', () => {
  test('names the Sandbox’s items by their object ids, comma-separated, trimmed and in their order, each once', () => {
    expect(readItems('http://localhost/')).toEqual([])
    expect(readItems('?item=prop-orb-spook')).toEqual(['prop-orb-spook'])
    expect(readItems('?item=prop-orb-spook,prop-orb-halloween')).toEqual(['prop-orb-spook', 'prop-orb-halloween'])
    expect(readItems('?item=%20b%20,,a,b,')).toEqual(['b', 'a'])
  })
  test('also come as a list in the packed permalink state, which overrides the query’s', () => {
    const data = Buffer.from(JSON.stringify({item: ['prop-orb-horror', 'prop-orb-spook']})).toBase64()
    expect(readItems(`?data=${data}`)).toEqual(['prop-orb-horror', 'prop-orb-spook'])
    expect(readItems(`?item=prop-orb-halloween#data:${data}`)).toEqual(['prop-orb-horror', 'prop-orb-spook'])
  })
  test('shows among the query overrides as given, and not at all without items', () => {
    expect(readQueryOverrides('http://localhost/?item=')).toBeUndefined()
    expect(readQueryOverrides('http://localhost/?item=prop-orb-spook,%20prop-orb-horror')).toEqual({item: 'prop-orb-spook,prop-orb-horror'})
  })
  test('puts every orb it names on a pedestal of its own, in their order, and refuses ids it doesn’t know', () => {
    const sandbox = new Sandbox(['prop-orb-horror', 'prop-orb-spook'])
    expect(sandbox.items.map(orb => orb.propId)).toEqual(['prop-orb-horror', 'prop-orb-spook'])
    expect(sandbox.room('cell').room.layout.pedestals).toHaveLength(2)
    expect(() => new Sandbox(['prop-orb-spook', 'prop-orb-pumpkin'])).toThrow('Unknown Sandbox item URL selection: prop-orb-pumpkin.')
  })
})
test('every orb brings a JPEG XL photograph of itself for the portal of its merges, in its own folder', async () => {
  for (const orb of orbs) {
    expect(orb.photo.replaceAll('\\', '/')).toEndWith(`/orbs/${orb.id}/photo.jxl`)
    const bytes = await Bun.file(orb.photo).bytes()
    // A bare JPEG XL codestream.
    expect([...bytes.subarray(0, 2)]).toEqual([0xFF, 0x0A])
  }
})
describe('the Cell’s layout', () => {
  test('follows the number of items: a door for none, a vestibule for one, alcoves for two or three, a rotunda for more', () => {
    const plan = (count: number) => {
      const layout = new CellLayout(count)
      return layout.plan
    }
    expect([0, 1, 2, 3, 4, 5, 12].map(plan)).toEqual(['closed', 'single', 'alcoves', 'alcoves', 'rotunda', 'rotunda', 'rotunda'])
    expect(() => new CellLayout(-1)).toThrow(RangeError)
    expect(() => new CellLayout(1.5)).toThrow(RangeError)
    const closed = new CellLayout(0)
    expect(closed.vestibule).toBeUndefined()
    expect(closed.spaces).toEqual([])
    expect(closed.pedestals).toEqual([])
  })
  test('lays its floor in whole tiles of 50 cm from wall to wall, under a ceiling the chandelier is lifted to', () => {
    const layout = new CellLayout(0)
    expect(layout.floorTile).toBe(0.5)
    for (const side of layout.size) {
      expect(Number.isInteger(side / layout.floorTile)).toBe(true)
    }
    expect(layout.chandelierLift).toBe(0.2)
  })
  test('stands a lone item in the middle of its vestibule, facing the arch', () => {
    const layout = new CellLayout(1)
    const vestibule = layout.vestibule!
    expect(vestibule.radius).toBe(4)
    expect(vestibule.center).toEqual([0, layout.northZ - 4])
    expect(layout.pedestals).toEqual([{
      position: vestibule.center,
      rotation: 0,
    }])
  })
  test('lights the vestibule with an LED panel in the middle of its ceiling and every alcove with a shadowless light high over its item, and none of them while the door is shut', () => {
    const closed = new Sandbox([])
    expect(closed.lamps().map(lamp => lamp.id)).toEqual(['cell-chandelier'])
    for (const count of [1, 2, 3, 6]) {
      const {layout, lamps} = new Cell(new CellLayout(count))
      const led = lamps.get('led')!
      const [x, z] = layout.vestibule!.center
      expect(led.position).toEqual([x, cellLedY(layout.height) - cellLed.drop, z])
      expect(led.shadow ?? false).toBe(false)
      expect(led.kind ?? 'point').toBe('point')
      // It reaches across the whole vestibule, however large.
      expect(led.range!).toBeGreaterThanOrEqual(layout.vestibule!.radius * 2)
      expect(lamps.keys().filter(id => id.startsWith('alcove_')).toArray()).toEqual(layout.alcoves.map((_, index) => `alcove_${index}_light`))
      for (const [index, alcove] of layout.alcoves.entries()) {
        const light = lamps.get(`alcove_${index}_light`)!
        expect(light.position).toEqual([alcove.center[0], layout.height - alcoveLight.drop, alcove.center[1]])
        expect(light.shadow ?? false).toBe(false)
        expect(light.range!).toBeGreaterThan(alcove.radius)
      }
      expect(lamps.values().filter(lamp => lamp.kind === 'spot').toArray()).toEqual([])
    }
  })
  for (const count of [2, 3]) {
    test(`gives each of ${count} items a round alcove of its own, off the vestibule across from the arch, from the left to the right`, () => {
      const layout = new CellLayout(count)
      const vestibule = layout.vestibule!
      expect(layout.alcoves.map(alcove => alcove.name)).toEqual(Array.from({length: count}, (_, index) => `alcove_${index}`))
      expect(vestibule.arches.map(arch => arch.name)).toEqual(['cell', ...layout.alcoves.map(alcove => alcove.name)])
      const sandbox = new Sandbox(ids.slice(0, count))
      const cell = sandbox.room('cell')
      expect(sandbox.lamps().map(lamp => lamp.id)).toEqual(['cell-chandelier', 'cell-led', ...layout.alcoves.map((_, index) => `cell-alcove_${index}_light`)])
      const xs = layout.alcoves.map(alcove => alcove.center[0])
      expect(xs).toEqual(xs.toSorted((a, b) => a - b))
      for (const [index, alcove] of layout.alcoves.entries()) {
        // It touches the vestibule’s wall back to back, keeps clear of the other alcoves and stays north of the room.
        expect(distance(alcove.center, vestibule.center)).toBeCloseTo(vestibule.radius + alcove.radius, 9)
        expect(alcove.center[1] + alcove.radius).toBeLessThan(layout.northZ)
        for (const other of layout.alcoves.slice(index + 1)) {
          expect(distance(alcove.center, other.center)).toBeGreaterThan(alcove.radius + other.radius)
        }
        expect(alcove.arches).toHaveLength(1)
        const [arch] = alcove.arches
        expect(arch.name).toBe('vestibule')
        const pedestal = layout.pedestals[index]
        expect(pedestal.position).toEqual(alcove.center)
        // One of its sides faces the vestibule’s middle, through the alcove’s arch.
        expect(Math.cos((pedestal.rotation - Math.atan2(Math.cos(arch.angle), Math.sin(arch.angle))) * 4)).toBeCloseTo(1, 9)
        // Its alcove is part of the Cell and reached through the arch alone.
        const [x, z] = alcove.center
        const through: Vec3 = [vestibule.center[0] - Math.cos(arch.angle) * vestibule.radius, 1, vestibule.center[1] - Math.sin(arch.angle) * vestibule.radius]
        expect(sandbox.roomAt([x, 1, z])).toBe(cell)
        expect(sandbox.contains([x + 1.5, 1, z])).toBe(true)
        expect(sandbox.contains(through)).toBe(true)
        expect(sandbox.contains([x + Math.cos(arch.angle + Math.PI / 2) * alcove.radius, 1, z + Math.sin(arch.angle + Math.PI / 2) * alcove.radius])).toBe(false)
        // Behind it, across from its arch, lies nothing.
        expect(sandbox.placement.contains([x - Math.cos(arch.angle) * (alcove.radius + 0.1), 1, z - Math.sin(arch.angle) * (alcove.radius + 0.1)])).toBe(false)
      }
    })
  }
  for (const count of [4, 5, 6, 8, 12]) {
    test(`rings ${count} items round the rotunda’s middle, wide enough to walk between, round and behind them, the ring open toward the arch`, () => {
      const layout = new CellLayout(count)
      const vestibule = layout.vestibule!
      expect(layout.alcoves).toEqual([])
      expect(vestibule.center[1] + vestibule.radius).toBeCloseTo(layout.northZ, 9)
      expect(vestibule.radius).toBeGreaterThan(4)
      const ring = distance(layout.pedestals[0].position, vestibule.center)
      expect(ring).toBeGreaterThanOrEqual(2.4 - 1e-9)
      expect(vestibule.radius - ring).toBeCloseTo(2.4, 6)
      for (const [index, {position, rotation}] of layout.pedestals.entries()) {
        expect(distance(position, vestibule.center)).toBeCloseTo(ring, 6)
        for (const other of layout.pedestals.slice(index + 1)) {
          expect(distance(position, other.position)).toBeGreaterThanOrEqual(Math.max(2.6, pedestalDiagonal) - 1e-9)
        }
        // A side faces the middle.
        const [x, z] = position
        expect(Math.cos((rotation - Math.atan2(vestibule.center[0] - x, vestibule.center[1] - z)) * 4)).toBeCloseTo(1, 9)
        // None stands in the way from the arch to the middle.
        expect(Math.abs(x) > vestibule.arch.width / 2 + 0.58 || z < vestibule.center[1]).toBe(true)
      }
    })
  }
  test('draws its map from what lies beyond the north wall, framing every space and a pedestal for every item', () => {
    for (const count of [0, 1, 2, 3, 6]) {
      const layout = new CellLayout(count)
      const svg = cellMap(layout)
      const map = new RoomMap(svg)
      const [x, z, width, depth] = map.frame
      const xs = [-layout.size[0] / 2, layout.size[0] / 2, ...layout.spaces.flatMap(space => [space.center[0] - space.radius, space.center[0] + space.radius])]
      const zs = [layout.size[1] / 2, ...layout.spaces.map(space => space.center[1] - space.radius), -layout.size[1] / 2]
      expect(x).toBeCloseTo(Math.min(...xs), 4)
      expect(x + width).toBeCloseTo(Math.max(...xs), 4)
      expect(z).toBeCloseTo(Math.min(...zs), 4)
      expect(z + depth).toBeCloseTo(layout.size[1] / 2, 4)
      expect(svg.match(/<circle /gu) ?? []).toHaveLength(layout.spaces.length)
      expect(svg.match(/<rect /gu) ?? []).toHaveLength(layout.pedestals.length + (count ? 0 : 1))
      expect(svg.match(/<polygon /gu) ?? []).toHaveLength(layout.alcoves.length)
    }
  })
  test('carries the items’ pedestals as high as every other, their caps far under the ceiling', () => {
    const layout = new CellLayout(0)
    expect(pedestalHeight).toBeLessThan(layout.height / 2)
  })
})
describe('the Cell’s trim and door', () => {
  test('runs a low molded baseboard along the round spaces’ walls, which stands out of the face less than the old bands, and the Sienna’s tall one along the hall’s, the velvet lining the arch through the north one', () => {
    const [toe] = cellBaseboard
    const top = cellBaseboard.at(-1)!
    expect(toe).toEqual([toe[0], 0])
    expect(top[0]).toBe(wallFace)
    expect(top[1]).toBeLessThan(0.25)
    expect(Math.max(...cellBaseboard.map(([front]) => front))).toBeLessThan(0.2)
    for (const count of [0, 1, 3]) {
      const sandbox = new Sandbox(ids.slice(0, count))
      const round = sandbox.walls.filter(wall => wall.curveRadius)
      const hall = sandbox.walls.filter(wall => !wall.curveRadius)
      expect(round).toHaveLength(sandbox.room('cell').room.layout.spaces.length)
      expect(hall.map(wall => wall.id).toSorted()).toEqual(['cell-east', 'cell-north', 'cell-south', 'cell-west'])
      for (const wall of round) {
        expect(wall.baseboardSection).toBe(cellBaseboard)
      }
      for (const wall of hall) {
        expect(wall.baseboardSection).toBeUndefined()
        const {surface, trim: [trim]} = architectureGeometry(wall)
        trim.computeBoundingBox()
        // The Sienna’s two plain bands, apart from the plinth blocks the casing of an opening stands on.
        if (!wall.holes?.length) {
          expect(trim.boundingBox!.max.y).toBeCloseTo(0.44, 6)
          continue
        }
        // The arch’s reveal, all of it inside the opening and across from the wall’s faces, takes the second material.
        const lined = withOpeningReveals(surface, wall)
        try {
          const [faces, reveals] = lined.groups
          expect(faces.start).toBe(0)
          expect(reveals.start).toBe(faces.count)
          expect(faces.count + reveals.count).toBe(lined.index!.count)
          expect(reveals.count).toBeGreaterThan(0)
          const [hole] = wall.holes
          const position = lined.getAttribute('position')
          for (let index = reveals.start; index < reveals.start + reveals.count; index++) {
            const corner = lined.index!.getX(index)
            expect(Math.abs(position.getX(corner) - hole.u)).toBeLessThanOrEqual(hole.width / 2 + 0.01)
            expect(position.getY(corner)).toBeLessThanOrEqual(hole.height + 0.01)
          }
        } finally {
          lined.dispose()
        }
      }
    }
    const lone = new Sandbox(ids.slice(0, 1))
    const ring = lone.walls.find(wall => wall.curveRadius)!
    expect(() => withOpeningReveals(architectureGeometry(ring).surface, ring)).toThrow(RangeError)
  })
  test('refuses baseboard sections that sink into the wall, run downward or end off its face', () => {
    const sandbox = new Sandbox([])
    const [wall] = sandbox.walls
    const cut = (baseboardSection: ReadonlyArray<readonly [number, number]>) => () => architectureGeometry({
      ...wall,
      baseboardSection,
    })
    expect(cut([[0.1, 0], [wallFace, 0.1]])).toThrow(RangeError)
    expect(cut([[0.15, 0], [0.15, 0.1], [0.14, 0.05], [wallFace, 0.12]])).toThrow(RangeError)
    expect(cut([[0.15, 0], [0.12, 0.1]])).toThrow(RangeError)
  })
  test('fills the opening it closes, a little into the wall round it, without reaching out past its casing', () => {
    const sandbox = new Sandbox([])
    const north = sandbox.walls.find(wall => wall.id === 'cell-north')!
    const hole = north.holes!.find(candidate => candidate.name === 'door')!
    const door = new CellDoorGeometry(hole)
    try {
      for (const part of [door.lacquer, door.velvet, door.brass]) {
        part.computeBoundingBox()
      }
      const {min, max} = door.lacquer.boundingBox!
      expect(max.x).toBeGreaterThan(hole.width / 2)
      expect(min.x).toBeLessThan(-hole.width / 2)
      expect(max.y).toBeGreaterThan(hole.height)
      expect(min.y).toBeGreaterThan(0)
      for (const part of [door.lacquer, door.velvet, door.brass]) {
        expect(part.boundingBox!.max.z).toBeLessThan(0.27)
        expect(part.boundingBox!.min.z).toBeGreaterThanOrEqual(-1e-6)
        expect(Math.abs(part.boundingBox!.max.x)).toBeLessThan(hole.width / 2 + 0.02)
      }
    } finally {
      door.dispose()
    }
    expect(() => new CellDoorGeometry({
      ...hole,
      profile: 'rectangle',
    })).toThrow(RangeError)
  })
})
describe('the Cell’s ceilings', () => {
  test('coffer the hall in equal fields between the beams and the cornice, one of them round the chandelier and clear of its ring', () => {
    const {size} = new CellLayout(0)
    const {beam, count} = cellCoffers
    for (const [axis, length] of size.entries()) {
      const {beams, field, middles} = cofferLine(length, count[axis])
      expect(count[axis] % 2).toBe(1)
      expect(middles).toHaveLength(count[axis])
      expect(beams).toHaveLength(count[axis] - 1)
      // Fields and beams alternate evenly from cornice to cornice, the cornice 34 cm out of the walls’ center lines.
      expect(middles[0] - field / 2).toBeCloseTo(-length / 2 + 0.34, 9)
      expect(middles.at(-1)! + field / 2).toBeCloseTo(length / 2 - 0.34, 9)
      for (const [index, middle] of beams.entries()) {
        expect(middle - beam.width / 2).toBeCloseTo(middles[index] + field / 2, 9)
        expect(middle + beam.width / 2).toBeCloseTo(middles[index + 1] - field / 2, 9)
      }
      expect(middles[(count[axis] - 1) / 2]).toBeCloseTo(0, 9)
      // The chandelier’s ring swings 66 cm out from its stem.
      expect(field / 2).toBeGreaterThan(0.8)
    }
    const [x, z] = size.map((length, axis) => cofferLine(length, count[axis]).field)
    expect(Math.abs(x - z) / x).toBeLessThan(0.02)
  })
  for (const count of [0, 1, 2, 3, 4, 6, 12]) {
    test(`hangs every beam and bit of gilding under its slab, high over the arches, the LED panel in the middle of the vestibule’s, with ${count} items`, () => {
      const layout = new CellLayout(count)
      const geometry = new CellCeilingGeometry(layout)
      try {
        const underside = layout.height - cellCeilingSlab / 2
        const [width, depth] = layout.size
        for (const part of [geometry.beams, geometry.crossBeams, geometry.gilt, geometry.hall]) {
          part.computeBoundingBox()
        }
        const beams = geometry.beams.boundingBox!
        expect(beams.min.y).toBeCloseTo(underside - cellCoffers.beam.depth, 6)
        expect(beams.max.y).toBeCloseTo(underside, 6)
        expect(beams.max.x).toBeCloseTo(width / 2, 6)
        // Laid along x, the mesh turns them onto z: local x becomes world −z and local z world x.
        const cross = geometry.crossBeams.boundingBox!
        expect(cross.min.x).toBeCloseTo(-depth / 2, 6)
        expect(cross.max.x).toBeCloseTo(depth / 2, 6)
        expect(Math.max(-cross.min.z, cross.max.z)).toBeLessThan(width / 2)
        expect(cross.min.y).toBeCloseTo(beams.min.y, 6)
        const gilt = geometry.gilt.boundingBox!
        // No deeper than the beams.
        expect(gilt.min.y).toBeGreaterThan(beams.min.y)
        expect(gilt.min.y).toBeGreaterThan(layout.arch.height + 1)
        expect(gilt.max.y).toBeLessThan(layout.height)
        expect(geometry.hall.boundingBox!.min.y).toBeCloseTo(underside, 6)
        if (layout.spaces.length) {
          geometry.rounds.computeBoundingBox()
          expect(geometry.rounds.boundingBox!.min.y).toBeCloseTo(underside, 6)
        } else {
          expect(geometry.rounds.getAttribute('position')).toBeUndefined()
        }
        // The panel’s housing reaches 5 mm into the slab, over the vestibule’s middle, where no rosette hangs.
        if (layout.vestibule) {
          expect(cellLedY(layout.height) + knotLightHousingY + knotLightHousingSize[1] / 2).toBeCloseTo(underside + 0.005, 9)
        }
      } finally {
        geometry.dispose()
      }
    })
  }
})

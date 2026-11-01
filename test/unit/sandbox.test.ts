import type {Vec3} from '../../src/lib/gallery/types.ts'

import {describe, expect, test} from 'bun:test'

import {architectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {wallFace} from '../../src/lib/gallery/architectureDimensions.ts'
import CellDoorGeometry from '../../src/lib/gallery/CellDoorGeometry.ts'
import {orbSeat} from '../../src/lib/gallery/OrbHolderGeometry.ts'
import {orbs} from '../../src/lib/gallery/orbs/index.ts'
import {pedestalHeight} from '../../src/lib/gallery/PedestalGeometry.ts'
import {aimThrower} from '../../src/lib/gallery/SpotlightThrowerGeometry.ts'
import readQueryOverrides from '../../src/lib/queryOverrides.ts'
import cellBaseboard from '../../src/rooms/cell/baseboard.ts'
import CellLayout from '../../src/rooms/cell/CellLayout.ts'
import cellMap from '../../src/rooms/cell/map.ts'
import RoomMap from '../../src/rooms/lib/RoomMap.ts'
import {readItems} from '../../src/worlds/sandbox/items.ts'
import Sandbox from '../../src/worlds/sandbox/Sandbox.ts'

const ids = orbs.map(orb => orb.propId)
/** the footprint of a pedestal, which no other may come closer to, middle to middle, than its diagonal */
const pedestalDiagonal = 1.16 * Math.SQRT2
const distance = ([ax, az]: readonly [number, number], [bx, bz]: readonly [number, number]) => Math.hypot(ax - bx, az - bz)
/** Checks that every thrower of the layout hangs from its ceiling inside a space of it, clear of its wall, and aims at the middle of an orb in its holder on a pedestal, from above at a slant, its light shining from in front of it toward that orb. */
function expectThrowersOver(layout: CellLayout) {
  for (const {ceiling, target} of layout.throwers) {
    const [x, y, z] = ceiling
    expect(y).toBe(layout.height)
    expect(layout.spaces.some(space => distance([x, z], space.center) <= space.radius - 0.45)).toBe(true)
    expect(layout.pedestals.some(({position}) => distance(position, [target[0], target[2]]) < 1e-9)).toBe(true)
    expect(target[1]).toBeCloseTo(pedestalHeight + orbSeat, 9)
    const reach = distance([x, z], [target[0], target[2]])
    expect(reach).toBeGreaterThan(1.5)
    expect(reach).toBeLessThan(3)
    const {pivot, source, tilt} = aimThrower(ceiling, target)
    expect(tilt).toBeGreaterThan(Math.PI / 4)
    expect(tilt).toBeLessThan(Math.PI * 0.4)
    const along = (point: Vec3) => point.map((value, index) => value - pivot[index])
    const [sx, sy, sz] = along(source)
    const [tx, ty, tz] = along(target)
    // On the line from the pivot to the target, a little way along it.
    expect(Math.hypot(sy * tz - sz * ty, sz * tx - sx * tz, sx * ty - sy * tx)).toBeLessThan(1e-9)
    expect(sx * tx + sy * ty + sz * tz).toBeGreaterThan(0)
  }
}
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
    expect(readQueryOverrides('http://localhost/?world=sandbox')).toEqual({world: 'sandbox'})
    expect(readQueryOverrides('http://localhost/?world=sandbox&item=prop-orb-spook,%20prop-orb-horror')).toEqual({
      world: 'sandbox',
      item: 'prop-orb-spook,prop-orb-horror',
    })
  })
  test('puts every orb it names on a pedestal of its own, in their order, and refuses ids it doesn’t know', () => {
    const sandbox = new Sandbox(['prop-orb-horror', 'prop-orb-spook'])
    expect(sandbox.items.map(orb => orb.propId)).toEqual(['prop-orb-horror', 'prop-orb-spook'])
    expect(sandbox.room('cell').room.layout.pedestals).toHaveLength(2)
    expect(() => new Sandbox(['prop-orb-spook', 'prop-orb-pumpkin'])).toThrow('Unknown Sandbox item URL selection: prop-orb-pumpkin.')
  })
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
  test('lights a lone item with two throwers, from the front, mirrored to the left and the right of the arch, and none while the door is shut', () => {
    const closed = new CellLayout(0)
    expect(closed.throwers).toEqual([])
    const layout = new CellLayout(1)
    expect(layout.throwers).toHaveLength(2)
    expectThrowersOver(layout)
    const [left, right] = layout.throwers.map(thrower => thrower.ceiling)
    const [x, z] = layout.vestibule!.center
    expect(left[0] - x).toBeCloseTo(x - right[0], 9)
    expect(left[0]).toBeLessThan(x)
    expect(left[2]).toBeCloseTo(right[2], 9)
    // Toward the arch, in front of the item.
    expect(left[2]).toBeGreaterThan(z)
  })
  for (const count of [2, 3]) {
    test(`gives each of ${count} items a round alcove of its own, off the vestibule across from the arch, from the left to the right`, () => {
      const layout = new CellLayout(count)
      const vestibule = layout.vestibule!
      expect(layout.alcoves.map(alcove => alcove.name)).toEqual(Array.from({length: count}, (_, index) => `alcove_${index}`))
      expect(vestibule.arches.map(arch => arch.name)).toEqual(['cell', ...layout.alcoves.map(alcove => alcove.name)])
      const sandbox = new Sandbox(ids.slice(0, count))
      const cell = sandbox.room('cell')
      expect(sandbox.lamps().map(lamp => lamp.id)).toEqual(['cell-chandelier', ...layout.alcoves.map((_, index) => `cell-thrower_${index}`)])
      expectThrowersOver(layout)
      // Each inside its alcove’s arch, aimed at the alcove’s own item.
      for (const [index, {ceiling, target}] of layout.throwers.entries()) {
        const alcove = layout.alcoves[index]
        expect([target[0], target[2]]).toEqual([...alcove.center])
        expect(distance([ceiling[0], ceiling[2]], alcove.center)).toBeLessThan(alcove.radius)
        expect(distance([ceiling[0], ceiling[2]], vestibule.center)).toBeLessThan(distance(alcove.center, vestibule.center))
      }
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
    test(`rings ${count} items round the rotunda’s middle, wide enough to walk between, round and behind them, the ring open toward the arch, each lit by a thrower hanging toward the middle`, () => {
      const layout = new CellLayout(count)
      const vestibule = layout.vestibule!
      expect(layout.alcoves).toEqual([])
      expect(vestibule.center[1] + vestibule.radius).toBeCloseTo(layout.northZ, 9)
      expect(vestibule.radius).toBeGreaterThan(4)
      expectThrowersOver(layout)
      expect(layout.throwers.map(({target}) => [target[0], target[2]])).toEqual(layout.pedestals.map(({position}) => [...position]))
      for (const [index, {ceiling}] of layout.throwers.entries()) {
        expect(distance([ceiling[0], ceiling[2]], vestibule.center)).toBeLessThan(distance(layout.pedestals[index].position, vestibule.center))
      }
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
  test('runs a low molded baseboard along every wall, round ones too, which stands out of the face less than the old bands', () => {
    const [toe] = cellBaseboard
    const top = cellBaseboard.at(-1)!
    expect(toe).toEqual([toe[0], 0])
    expect(top[0]).toBe(wallFace)
    expect(top[1]).toBeLessThan(0.25)
    expect(Math.max(...cellBaseboard.map(([front]) => front))).toBeLessThan(0.2)
    for (const count of [0, 3]) {
      const sandbox = new Sandbox(ids.slice(0, count))
      for (const wall of sandbox.walls) {
        expect(wall.baseboardSection).toBe(cellBaseboard)
        const [trim] = architectureGeometry(wall).trim
        trim.computeBoundingBox()
        // Its own height, apart from the plinth blocks the casing of an opening stands on; a round wall’s bends with it.
        if (!wall.holes?.length) {
          expect(trim.boundingBox!.max.y).toBeCloseTo(top[1], 6)
        }
        if (!wall.curveRadius) {
          expect(trim.boundingBox!.max.z).toBeLessThan(wall.holes?.length ? 0.4 : 0.15)
        }
      }
    }
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

import {describe, expect, test} from 'bun:test'

const file = new URL('../../packages/knot-materials/src/entries/starbirth_vessel/Material.ts', import.meta.url)
const source = await Bun.file(file).text()
const constant = (name: string) => {
  const pattern = new RegExp(String.raw`^const ${name} = ([\d.]+)$`, 'mu')
  const match = pattern.exec(source)
  if (!match) {
    throw new Error(`${name} is not a numeric constant.`)
  }
  return Number(match[1])
}
const steps = constant('steps')
const starScale = constant('starScale')
const starJitter = constant('starJitter')
const segmentCells = constant('segmentCells')
const maximumChord = 0.5
const starReach = (1 - starJitter) / 2 / starScale
type Vector = [number, number, number]
// Deterministic stand-in for the shader's cell hash; only the walk is under test.
const hash = (cell: Vector) => {
  const value = Math.sin(cell[0] * 127.1 + cell[1] * 311.7 + cell[2] * 74.7) * 43_758.5453
  return value - Math.floor(value)
}
const starIn = (cell: Vector): Vector => cell.map((c, axis) => (c + hash([cell[0] + axis * 13, cell[1], cell[2]]) * starJitter + (1 - starJitter) / 2) / starScale) as Vector
/** CPU mirror of the shader's per-segment cell walk. */
function walk(origin: Vector, direction: Vector, start: number, end: number) {
  const q = origin.map((o, axis) => (o + direction[axis] * start) * starScale) as Vector
  const cell = q.map(Math.floor) as Vector
  const stride = direction.map(Math.sign)
  const crossing = direction.map(d => 1 / (Math.max(Math.abs(d), 0.000001) * starScale))
  const toWall = q.map((value, axis) => {
    const wall = value - cell[axis]
    return (direction[axis] >= 0 ? 1 - wall : wall) * crossing[axis]
  })
  const visited: Array<string> = []
  for (let index = 0; index < segmentCells; index++) {
    visited.push(cell.join())
    const next = Math.min(...toWall)
    if (next >= end - start) {
      return {
        visited,
        complete: true,
      }
    }
    const axis = toWall.findIndex(value => value <= next)
    cell[axis] += stride[axis]
    toWall[axis] += crossing[axis]
  }
  return {
    visited,
    complete: false,
  }
}
let seed = 7
const random = () => {
  seed = seed * 16_807 % 2_147_483_647
  return seed / 2_147_483_647
}
describe('Starbirth Vessel stars', () => {
  test('a march step is shorter than a cell, so it crosses at most four cells', () => {
    expect(maximumChord / steps).toBeLessThan(1 / starScale)
    expect(segmentCells).toBe(4)
  })
  test('finds every star that the ray passes within reach of, exactly in the step holding its closest approach', () => {
    let found = 0
    for (let ray = 0; ray < 150; ray++) {
      const origin: Vector = [random() - 0.5, random() - 0.5, random() - 0.5]
      const raw: Vector = [random() - 0.5, random() - 0.5, random() - 0.5]
      const norm = Math.hypot(...raw)
      const direction = raw.map(value => value / norm) as Vector
      const chord = maximumChord * (0.2 + random() * 0.8)
      const step = chord / steps
      const visits: Array<Set<string>> = []
      for (let index = 0; index < steps; index++) {
        const {visited, complete} = walk(origin, direction, index * step, (index + 1) * step)
        expect(complete).toBe(true)
        visits.push(new Set(visited))
      }
      // Every star the ray passes within reach of sits in a cell walked by the step holding its closest approach.
      const candidates = new Set<string>
      for (let t = 0; t < chord; t += 0.25 / starScale) {
        const point = origin.map((o, axis) => o + direction[axis] * t) as Vector
        const base = point.map(value => Math.floor(value * starScale))
        for (const dx of [-1, 0, 1]) {
          for (const dy of [-1, 0, 1]) {
            for (const dz of [-1, 0, 1]) {
              const cell: Vector = [base[0] + dx, base[1] + dy, base[2] + dz]
              if (candidates.has(cell.join())) {
                continue
              }
              candidates.add(cell.join())
              const star = starIn(cell)
              const toStar = star.map((s, axis) => s - origin[axis])
              const along = toStar.reduce((sum, value, axis) => sum + value * direction[axis], 0)
              if (along < 0 || along >= chord) {
                continue
              }
              const miss = Math.hypot(...toStar.map((value, axis) => value - direction[axis] * along))
              if (!(miss < starReach)) {
                continue
              }
              expect(visits[Math.floor(along / step)].has(cell.join())).toBe(true)
              found++
            }
          }
        }
      }
    }
    expect(found).toBeGreaterThan(0)
  })
})

import type {ProfilePoint} from '../RevolvedProfileGeometry.ts'
import type {WaterSheet} from './config.ts'
import type {BufferGeometry} from 'three/webgpu'

import {CircleGeometry, Float32BufferAttribute} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import RevolvedProfileGeometry from '../RevolvedProfileGeometry.ts'
import fountain, {sheetFlightTime, sheetLanding, sheetPoint} from './config.ts'

const {basinApothem, basinInnerApothem, basinFloor, rimTop, pools, veils, jet, gravity} = fountain
/** Every profile runs from the axis outward with the stone on its right, see RevolvedProfileGeometry. */
const profiles = {
  basin: [
    [0, basinFloor],
    [basinInnerApothem, basinFloor],
    [basinInnerApothem, rimTop - 0.025],
    [basinInnerApothem + 0.025, rimTop],
    [basinApothem - 0.05, rimTop],
    [basinApothem - 0.005, rimTop - 0.03],
    [basinApothem - 0.005, rimTop - 0.075],
    [basinApothem - 0.06, rimTop - 0.105],
    [basinApothem - 0.06, 0.16],
    [basinApothem, 0.13],
    [basinApothem, 0],
  ],
  // A baluster from inside the tazza down to the basin floor.
  column: [
    [0.15, 1.05],
    [0.15, 0.96],
    [0.205, 0.92],
    [0.205, 0.87],
    [0.16, 0.84],
    [0.19, 0.62],
    [0.245, 0.45],
    [0.245, 0.4],
    [0.34, 0.36],
    [0.34, basinFloor - 0.01],
  ],
  tazza: [
    [0, 1.2],
    [0.5, 1.22],
    [0.8, 1.275],
    [0.94, 1.325],
    [0.965, 1.354],
    [0.985, 1.36],
    [1.001, 1.35],
    [1.006, 1.33],
    [0.992, 1.302],
    [0.93, 1.255],
    [0.7, 1.135],
    [0.42, 1.06],
    [0.24, 1.03],
    [0.13, 1.025],
  ],
  stem: [
    [0.068, 1.83],
    [0.068, 1.73],
    [0.098, 1.7],
    [0.098, 1.665],
    [0.075, 1.64],
    [0.082, 1.43],
    [0.12, 1.33],
    [0.165, 1.26],
    [0.21, 1.19],
  ],
  cup: [
    [0, 1.88],
    [0.2, 1.9],
    [0.335, 1.94],
    [0.362, 1.972],
    [0.378, 1.976],
    [0.391, 1.968],
    [0.394, 1.952],
    [0.38, 1.932],
    [0.3, 1.862],
    [0.16, 1.812],
    [0.05, 1.8],
  ],
  nozzle: [
    [0, jet.y + 0.004],
    [jet.radius + 0.004, jet.y],
    [0.026, 2],
    [0.032, 1.965],
    [0.052, 1.932],
    [0.06, 1.89],
    [0.06, 1.87],
  ],
} satisfies Record<string, Array<ProfilePoint>>
/**
 * UV u wraps around the axis and v is the water’s age in seconds.
 * `waterFall` is the fraction of a veil’s fall already behind it, which tears the sheet apart; `waterAir` is how much air the water has taken in, which turns it white.
 */
function waterPart(geometry: BufferGeometry, duration: number, isVeil: boolean) {
  const uv = geometry.getAttribute('uv')
  const fall = new Float32Array(uv.count)
  const air = new Float32Array(uv.count)
  for (let i = 0; i < uv.count; i++) {
    const progress = uv.getY(i) / duration
    fall[i] = isVeil ? progress : 0
    air[i] = isVeil ? 0.08 + progress ** 2 * 0.6 : 0.45 + progress * 0.35
  }
  geometry.setAttribute('waterFall', new Float32BufferAttribute(fall, 1))
  geometry.setAttribute('waterAir', new Float32BufferAttribute(air, 1))
  return geometry
}
function veil(sheet: WaterSheet, sides: number, samples: number) {
  const duration = sheetFlightTime(sheet)
  const ages = Array.from({length: samples + 1}, (_, i) => duration * i / samples)
  // The sheet starts on its pool’s surface; drawing it as a revolved line yields a seamless, double-sided curtain.
  return waterPart(new RevolvedProfileGeometry(ages.map(age => sheetPoint(sheet, age)), {
    sides,
    uv: (point, around) => [around, ages[point]],
  }), duration, true)
}
/** The jet narrows with height by continuity until it slows, swells and ends in a rounded crown below its apex. */
function jetColumn(samples: number) {
  const rise = jet.speed ** 2 / (2 * gravity)
  const heights = Array.from({length: samples + 1}, (_, i) => rise * jet.solid * (1 - (1 - i / samples) ** 1.6))
  const age = (height: number) => (jet.speed - Math.sqrt(jet.speed ** 2 - 2 * gravity * height)) / gravity
  const radius = (height: number) => jet.radius * Math.sqrt(jet.speed / Math.sqrt(jet.speed ** 2 - 2 * gravity * height))
  const top = heights.at(-1)!
  const crown = radius(top)
  // From the tip down, so that the outside of the column is on the left of travel.
  const points: Array<[number, number, number]> = [
    [0, jet.y + top + crown, age(top)],
    [crown * 0.75, jet.y + top + crown * 0.66, age(top)],
    ...heights.toReversed().map((height): [number, number, number] => [radius(height), jet.y + height, age(height)]),
  ]
  return waterPart(new RevolvedProfileGeometry(points.map(([r, y]) => [r, y]), {
    sides: 8,
    uv: (point, around) => [around, points[point][2]],
  }), age(top), false)
}
/** A water surface with the same polygon corners as RevolvedProfileGeometry, `apothem` measured like its profiles. */
function pool(apothem: number, sides: number, y: number, splash: number) {
  const geometry = new CircleGeometry(apothem / Math.cos(Math.PI / sides), sides, Math.PI / sides).rotateX(-Math.PI / 2).translate(0, y, 0)
  geometry.setAttribute('splashRadius', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count).fill(splash), 1))
  return geometry
}

/** An octagonal carved basin holding a baluster tazza and a cup, with continuous overflowing veils, merged by material. */
export default class FountainGeometry {
  static readonly profiles = profiles
  readonly brass: BufferGeometry
  readonly pools: BufferGeometry
  readonly stone: BufferGeometry
  readonly water: BufferGeometry

  constructor() {
    this.stone = mergeParts([
      new RevolvedProfileGeometry(profiles.basin, {sides: 8}),
      new RevolvedProfileGeometry(profiles.column, {sides: 20}),
      new RevolvedProfileGeometry(profiles.tazza, {sides: 40}),
      new RevolvedProfileGeometry(profiles.stem, {sides: 16}),
      new RevolvedProfileGeometry(profiles.cup, {sides: 28}),
    ])
    this.brass = mergeParts([new RevolvedProfileGeometry(profiles.nozzle, {sides: 12})])
    this.pools = mergeParts([
      // The basin surface tucks into the stone instead of leaving a sliver at the walls; the bowls brim over their lips.
      pool(basinInnerApothem + 0.004, 8, pools.basin, sheetLanding(veils.tazza)),
      pool(veils.tazza.radius, 40, pools.tazza, sheetLanding(veils.cup)),
      pool(veils.cup.radius, 28, pools.cup, 0),
    ])
    this.water = mergeParts([
      veil(veils.tazza, 40, 10),
      veil(veils.cup, 28, 8),
      jetColumn(10),
    ])
  }

  dispose() {
    this.stone.dispose()
    this.brass.dispose()
    this.pools.dispose()
    this.water.dispose()
  }
}

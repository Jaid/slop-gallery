import type {Vec3} from '../types.ts'

import {Box3, BufferGeometry, Float32BufferAttribute, Sphere, Vector3} from 'three/webgpu'

import fire from './config.ts'

export type Flame = {
  /** center of the flame’s base, in the fire frame */
  origin: Vec3
  /** decorrelates each sheet’s turbulence */
  seed: number
  /** width and height in meters */
  size: [number, number]
}

const goldenRatio = (Math.sqrt(5) - 1) / 2
/** deterministic, evenly spread pseudo-random fractions */
const sequence = (i: number, seed: number) => (i * goldenRatio + seed) % 1
/** deterministic, irregular offsets between −1 and 1 */
const scatter = (i: number) => {
  const value = Math.sin(i * 12.9898 + 4.1414) * 43_758.5453
  return (value - Math.floor(value)) * 2 - 1
}

/**
 * Where the flame sheets stand: a row of tall flames rising from the ember gap between the logs, tallest in the middle, plus smaller tongues licking over the top of each log.
 */
export function fireFlames() {
  const {spread, gapY, logTopY} = fire.flames
  const flames: Array<Flame> = []
  const gapCount = 7
  for (let i = 0; i < gapCount; i++) {
    const a = sequence(i, 0.21)
    const b = sequence(i * 5, 0.67)
    // Clumped, not evenly spaced: flames gather where the coals are hottest.
    const x = ((i + 0.5) / gapCount * 2 - 1) * spread + scatter(i) * 0.16
    const center = 1 - (x / spread) ** 2
    flames.push({
      origin: [x, gapY + a * 0.06, (b - 0.5) * 0.2],
      size: [0.3 + b * 0.18, 0.42 + center * 0.36 + sequence(i * 13, 0.37) * 0.22],
      seed: sequence(i * 3, 0.11),
    })
  }
  for (const [side, z] of fire.logs.offsets.entries()) {
    const count = 4
    for (let i = 0; i < count; i++) {
      const a = sequence(i + side * count, 0.43)
      const b = sequence((i + side * count) * 7, 0.29)
      // The two rows are staggered so their tongues never line up from the front.
      const x = ((i + 0.25 + side * 0.5) / count * 2 - 1) * spread * 0.95
      flames.push({
        // Tongues hug the inner, hotter flank of each log.
        origin: [x, logTopY + (b - 0.5) * 0.04, z * 0.6],
        size: [0.22 + a * 0.1, 0.24 + b * 0.16],
        seed: sequence((i + side * count) * 3 + 11, 0.83),
      })
    }
  }
  return flames
}

/**
 * Unit quads, one per flame, that the flame material turns into upright billboards around their base.
 *
 * Every vertex carries its flame’s base, size and seed, so the whole fire is one draw call.
 */
export default class FlameGeometry extends BufferGeometry {
  readonly flames: ReadonlyArray<Flame>

  constructor(flames = fireFlames()) {
    super()
    this.flames = flames
    const positions: Array<number> = []
    const uvs: Array<number> = []
    const origins: Array<number> = []
    const sizes: Array<number> = []
    const seeds: Array<number> = []
    const indices: Array<number> = []
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]] as const
    for (const [i, {origin, size, seed}] of flames.entries()) {
      for (const [u, v] of corners) {
        // The static position is the unturned quad; it only matters for bounds and tooling.
        positions.push(origin[0] + (u - 0.5) * size[0], origin[1] + v * size[1], origin[2])
        uvs.push(u, v)
        origins.push(...origin)
        sizes.push(...size)
        seeds.push(seed)
      }
      const base = i * 4
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
    this.setIndex(indices)
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    this.setAttribute('flameOrigin', new Float32BufferAttribute(origins, 3))
    this.setAttribute('flameSize', new Float32BufferAttribute(sizes, 2))
    this.setAttribute('flameSeed', new Float32BufferAttribute(seeds, 1))
    // Billboards turn around their vertical axis, so cover every orientation.
    const box = new Box3
    for (const {origin, size} of flames) {
      const radius = size[0] / 2
      box.expandByPoint(new Vector3(origin[0] - radius, origin[1], origin[2] - radius))
      box.expandByPoint(new Vector3(origin[0] + radius, origin[1] + size[1], origin[2] + radius))
    }
    this.boundingBox = box
    this.boundingSphere = box.getBoundingSphere(new Sphere)
  }
}

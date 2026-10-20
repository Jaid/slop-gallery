import type {ProfilePoint} from '../RevolvedProfileGeometry.ts'
import type {BufferGeometry} from 'three/webgpu'

import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {CatmullRomCurve3, Color, CylinderGeometry, Float32BufferAttribute, SphereGeometry, TorusGeometry, TubeGeometry, Vector3} from 'three/webgpu'

import RevolvedProfileGeometry from '../RevolvedProfileGeometry.ts'
import {tableware} from './layout.ts'

/** Unmerged parts of a piece of tableware, sorted by material. Every part is owned by the caller. */
export type TablewareParts = {
  flame: Array<BufferGeometry>
  fruit: Array<BufferGeometry>
  gold: Array<BufferGeometry>
  porcelain: Array<BufferGeometry>
  steel: Array<BufferGeometry>
  wax: Array<BufferGeometry>
}

export const emptyParts = (): TablewareParts => ({
  flame: [],
  fruit: [],
  gold: [],
  porcelain: [],
  steel: [],
  wax: [],
})

/** A charger plate of glazed porcelain, a wide flat rim over a shallow well, standing on a foot ring. */
export const plateProfile: ReadonlyArray<ProfilePoint> = [
  [0, 0.009],
  [0.088, 0.009],
  [0.1, 0.0125],
  [0.141, 0.0168],
  [0.1488, 0.018],
  [0.15, 0.0166],
  [0.1465, 0.0146],
  [0.1, 0.0086],
  [0.076, 0.0042],
  [0.073, 0],
  [0.061, 0],
  [0.059, 0.003],
  [0, 0.003],
]
/** A gilt goblet: a tulip bowl hollowed to a 3 mm wall, a knopped stem and a domed foot. */
export const gobletProfile: ReadonlyArray<ProfilePoint> = [
  [0, 0.104],
  [0.019, 0.106],
  [0.031, 0.117],
  [0.037, 0.138],
  [0.0385, 0.177],
  [0.04, 0.18],
  [0.0418, 0.178],
  [0.0405, 0.138],
  [0.034, 0.114],
  [0.021, 0.099],
  [0.009, 0.092],
  [0.0068, 0.083],
  [0.012, 0.074],
  [0.0068, 0.064],
  [0.0058, 0.032],
  [0.009, 0.019],
  [0.03, 0.008],
  [0.04, 0.0035],
  [0.0405, 0],
  [0, 0],
]
/** the central column of a candelabrum, from its candle cup down through a baluster and a vase knop to a stepped, domed base */
export const candelabrumColumn: ReadonlyArray<ProfilePoint> = [
  [0, 0.395],
  [0.028, 0.395],
  [0.027, 0.385],
  [0.014, 0.37],
  [0.011, 0.335],
  [0.021, 0.318],
  [0.011, 0.3],
  [0.0105, 0.215],
  [0.024, 0.17],
  [0.025, 0.145],
  [0.016, 0.115],
  [0.012, 0.1],
  [0.022, 0.085],
  [0.045, 0.06],
  [0.072, 0.04],
  [0.087, 0.026],
  [0.09, 0.014],
  [0.09, 0],
  [0, 0],
]
/** a footed tazza: a shallow bowl on a knopped stem */
export const tazzaProfile: ReadonlyArray<ProfilePoint> = [
  [0, 0.118],
  [0.1, 0.128],
  [0.124, 0.146],
  [0.129, 0.149],
  [0.1315, 0.146],
  [0.108, 0.123],
  [0.04, 0.108],
  [0.014, 0.098],
  [0.011, 0.07],
  [0.02, 0.058],
  [0.011, 0.046],
  [0.013, 0.026],
  [0.055, 0.009],
  [0.065, 0.003],
  [0.065, 0],
  [0, 0],
]
/** a small drip pan under each arm’s candle */
const dripPan: ReadonlyArray<ProfilePoint> = [
  [0, 0.022],
  [0.026, 0.022],
  [0.027, 0.018],
  [0.012, 0.008],
  [0.008, 0],
  [0, 0],
]
const candle = {
  radius: 0.0105,
  centerHeight: 0.165,
  armHeight: 0.15,
}
/** the arms’ cups stand this far out from the column, on the diagonals */
const armReach = 0.165
const armCupY = 0.33
const flameAt = (target: TablewareParts, x: number, top: number, z: number) => {
  const wick = new CylinderGeometry(0.0012, 0.0012, 0.009, 4)
  target.wax.push(wick.translate(x, top + 0.0045, z))
  // A teardrop of light: a stretched sphere, narrowed toward its tip.
  const flame = new SphereGeometry(0.0075, 10, 8)
  const position = flame.getAttribute('position')
  for (let index = 0; index < position.count; index++) {
    const y = position.getY(index) / 0.0075
    const taper = y > 0 ? 1 - y * 0.55 : 1
    position.setXYZ(index, position.getX(index) * taper, position.getY(index) * (y > 0 ? 2.6 : 1.1), position.getZ(index) * taper)
  }
  flame.computeVertexNormals()
  target.flame.push(flame.translate(x, top + 0.016, z))
}

/** One diner’s setting in their frame: the charger’s middle at the origin, the diner looking along +z with their left at +x. */
export function placeSettingParts(target: TablewareParts) {
  target.porcelain.push(new RevolvedProfileGeometry(plateProfile, {sides: 40}))
  const rim = new TorusGeometry(0.1478, 0.0021, 4, 48)
  target.gold.push(rim.rotateX(Math.PI / 2).translate(0, 0.0168, 0))
  const goblet = new RevolvedProfileGeometry(gobletProfile, {sides: 20})
  target.gold.push(goblet.translate(tableware.goblet.offset[0], 0, tableware.goblet.offset[1]))
  const [forkX] = tableware.fork.offset
  const [knifeX] = tableware.knife.offset
  // Knife: a handle and a thin blade, its edge toward the plate.
  const knifeHandle = new RoundedBoxGeometry(0.014, 0.009, 0.095, 1, 0.004)
  const blade = new RoundedBoxGeometry(0.018, 0.0028, 0.12, 1, 0.0013)
  target.steel.push(knifeHandle.translate(knifeX, 0.0045, -0.058), blade.translate(knifeX + 0.002, 0.0016, 0.05))
  // Fork: a handle, a neck and four tines.
  const forkHandle = new RoundedBoxGeometry(0.014, 0.008, 0.11, 1, 0.0035)
  const neck = new RoundedBoxGeometry(0.022, 0.003, 0.03, 1, 0.0014)
  target.steel.push(forkHandle.translate(forkX, 0.004, -0.05), neck.translate(forkX, 0.0035, 0.018))
  for (let tine = 0; tine < 4; tine++) {
    const prong = new RoundedBoxGeometry(0.0034, 0.0026, 0.045, 1, 0.0012)
    target.steel.push(prong.translate(forkX - 0.0084 + tine * 0.0056, 0.0035, 0.053))
  }
}

/** A five-light gilt candelabrum: a central candle on the column and four on scrolled arms along the diagonals, each lit. */
export function candelabrumParts(target: TablewareParts) {
  target.gold.push(new RevolvedProfileGeometry(candelabrumColumn, {sides: 28}))
  const centerTop = candelabrumColumn[0][1]
  const centerCandle = new CylinderGeometry(candle.radius, candle.radius * 1.04, candle.centerHeight, 14)
  target.wax.push(centerCandle.translate(0, centerTop + candle.centerHeight / 2, 0))
  flameAt(target, 0, centerTop + candle.centerHeight, 0)
  for (let arm = 0; arm < 4; arm++) {
    const angle = Math.PI / 4 + arm * Math.PI / 2
    const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle))
    const along = (reach: number, y: number) => direction.clone().multiplyScalar(reach).setY(y)
    // An S-scroll from the baluster out and up to the drip pan.
    const curve = new CatmullRomCurve3([along(0, 0.235), along(0.05, 0.215), along(0.12, 0.235), along(armReach, 0.29), along(armReach, armCupY + 0.004)])
    target.gold.push(new TubeGeometry(curve, 24, 0.0068, 8))
    const pan = new RevolvedProfileGeometry(dripPan, {sides: 20})
    const x = direction.x * armReach
    const z = direction.z * armReach
    target.gold.push(pan.translate(x, armCupY, z))
    const panTop = armCupY + dripPan[0][1]
    // Each arm’s candle stands on its own drip pan.
    const armCandle = new CylinderGeometry(candle.radius, candle.radius * 1.04, candle.armHeight, 14)
    target.wax.push(armCandle.translate(x, panTop + candle.armHeight / 2, z))
    flameAt(target, x, panTop + candle.armHeight, z)
  }
}

const fruitColor = (geometry: BufferGeometry, paint: (point: Vector3) => Color) => {
  const position = geometry.getAttribute('position')
  const colors = new Float32Array(position.count * 3)
  const point = new Vector3
  for (let index = 0; index < position.count; index++) {
    point.fromBufferAttribute(position, index)
    const color = paint(point)
    colors.set([color.r, color.g, color.b], index * 3)
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return geometry
}
/** a deterministic pseudo-random number in [0, 1) */
const jitter = (seed: number) => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43_758.5453
  return value - Math.floor(value)
}

/** A gilt tazza heaped with fruit: red apples, oranges and a bunch of black grapes trailing over the rim. Fruit carries vertex colors. */
export function tazzaParts(target: TablewareParts, seed = 0) {
  target.gold.push(new RevolvedProfileGeometry(tazzaProfile, {sides: 40}))
  const bowl = 0.128
  const apple = new Color('#9c1b16')
  const blush = new Color('#d8a23a')
  const orange = new Color('#e0731c')
  const grape = new Color('#2b1430')
  const bloom = new Color('#5d4a6e')
  const stem = new Color('#4a3420')
  const fruits: Array<{
    kind: 'apple' | 'orange'
    position: Vector3
  }> = [
    ...[0, 1, 2, 3, 4].map(index => {
      const angle = index / 5 * Math.PI * 2 + seed
      return {
        kind: index % 2 ? 'orange' as const : 'apple' as const,
        position: new Vector3(Math.cos(angle) * 0.068, bowl + 0.034, Math.sin(angle) * 0.068),
      }
    }),
    {
      kind: 'apple',
      position: new Vector3(0.008, bowl + 0.08, -0.004),
    },
  ]
  for (const [index, {kind, position}] of fruits.entries()) {
    if (kind === 'orange') {
      const sphere = new SphereGeometry(0.036, 18, 12)
      target.fruit.push(fruitColor(sphere, point => orange.clone().multiplyScalar(0.92 + jitter(point.x * 91 + point.y * 37 + index) * 0.1)).translate(position.x, position.y, position.z))
      continue
    }
    const sphere = new SphereGeometry(0.035, 18, 12)
    sphere.scale(1, 0.9, 1)
    const turn = jitter(index + seed) * Math.PI * 2
    // Apples ripen red on the sunny side and stay golden on the other.
    target.fruit.push(fruitColor(sphere, point => apple.clone().lerp(blush, Math.max(0, Math.cos(Math.atan2(point.z, point.x) - turn) * 0.6 - point.y * 6))).translate(position.x, position.y, position.z))
    const stalk = new CylinderGeometry(0.0018, 0.0022, 0.016, 5)
    target.fruit.push(fruitColor(stalk, () => stem).translate(position.x, position.y + 0.035, position.z))
  }
  // A bunch of grapes hanging over the rim toward one diner.
  const side = jitter(seed + 3) > 0.5 ? 1 : -1
  const hang = new Vector3(side * 0.125, bowl + 0.045, 0.03)
  let grapes = 0
  for (let row = 0; row < 6; row++) {
    const ring = Math.max(1, 5 - row)
    for (let index = 0; index < ring; index++) {
      const angle = index / ring * Math.PI * 2 + row * 0.7
      const spread = 0.011 * Math.min(ring - 1, 2.4)
      const berry = new SphereGeometry(0.0095, 8, 6)
      const shade = jitter(grapes++ + seed * 13)
      target.fruit.push(fruitColor(berry, () => grape.clone().lerp(bloom, shade * 0.35)).translate(hang.x + side * (0.012 + row * 0.005) + Math.cos(angle) * spread, hang.y - row * 0.016, hang.z + Math.sin(angle) * spread))
    }
  }
  const grapeStalk = new CylinderGeometry(0.0016, 0.0016, 0.03, 5)
  target.fruit.push(fruitColor(grapeStalk, () => stem).translate(hang.x - side * 0.006, hang.y + 0.018, hang.z))
}

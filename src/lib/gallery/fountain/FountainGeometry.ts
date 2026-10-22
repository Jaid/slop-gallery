import type {ProfilePoint} from '../RevolvedProfileGeometry.ts'
import type {SpillRim} from './CarvedProfileGeometry.ts'
import type {WaterSheet} from './config.ts'

import {BufferGeometry, CircleGeometry, Curve, Float32BufferAttribute, TubeGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import RevolvedProfileGeometry from '../RevolvedProfileGeometry.ts'
import CarvedProfileGeometry, {carvedProfilePoint} from './CarvedProfileGeometry.ts'
import fountain, {sheetFlightTime, sheetLanding, sheetPoint} from './config.ts'

const {basinApothem, basinInnerApothem, basinFloor, rimTop, pools, spills, jet, gravity} = fountain
/** Profiles travel outward over the wet face, around the lip and down the dry underside. */
const profiles = {
  basin: [
    [0, basinFloor],
    [basinInnerApothem, basinFloor],
    [basinInnerApothem, 0.59],
    [1.63, 0.63],
    [1.69, rimTop],
    [1.85, rimTop],
    [1.91, 0.64],
    [1.93, 0.6],
    [1.93, 0.56],
    [1.88, 0.53],
    [1.82, 0.51],
    [1.82, 0.23],
    [1.87, 0.19],
    [1.92, 0.17],
    [basinApothem, 0.12],
    [basinApothem, 0.06],
    [1.91, 0],
    [0, 0],
  ],
  column: [
    [0, 1.62],
    [0.24, 1.62],
    [0.3, 1.56],
    [0.3, 1.51],
    [0.23, 1.47],
    [0.22, 1.36],
    [0.26, 1.17],
    [0.32, 0.99],
    [0.32, 0.89],
    [0.28, 0.79],
    [0.25, 0.75],
    [0.27, 0.66],
    [0.38, 0.59],
    [0.42, 0.53],
    [0.42, 0.48],
    [0.48, 0.43],
    [0.48, basinFloor],
    [0, basinFloor],
  ],
  tazza: [
    [0, 1.76],
    [0.38, 1.77],
    [0.7, 1.82],
    [0.92, 1.89],
    [1.015, 1.925],
    [1.055, 1.932],
    [1.06, 1.914],
    [1.035, 1.88],
    [0.96, 1.83],
    [0.83, 1.71],
    [0.63, 1.59],
    [0.39, 1.51],
    [0.23, 1.5],
    [0, 1.5],
  ],
  stem: [
    [0, 2.69],
    [0.14, 2.69],
    [0.18, 2.64],
    [0.18, 2.6],
    [0.13, 2.56],
    [0.115, 2.44],
    [0.15, 2.27],
    [0.19, 2.15],
    [0.19, 2.1],
    [0.15, 2.02],
    [0.18, 1.97],
    [0.27, 1.91],
    [0.27, 1.77],
    [0, 1.77],
  ],
  cup: [
    [0, 2.81],
    [0.22, 2.82],
    [0.38, 2.87],
    [0.48, 2.93],
    [0.505, 2.95],
    [0.508, 2.933],
    [0.49, 2.9],
    [0.42, 2.8],
    [0.3, 2.71],
    [0.16, 2.66],
    [0, 2.66],
  ],
  nozzle: [
    [0, jet.y + 0.004],
    [jet.radius + 0.004, jet.y],
    [0.04, 3.01],
    [0.065, 2.99],
    [0.065, 2.96],
    [0.05, 2.94],
    [0.08, 2.91],
    [0.09, 2.86],
    [0.09, 2.81],
    [0, 2.81],
  ],
} satisfies Record<string, Array<ProfilePoint>>
/** UV v is water age in seconds. Attributes distinguish falling ribbons from the aerated crown. */
function waterPart(geometry: BufferGeometry, duration: number, isSpill: boolean) {
  const uv = geometry.getAttribute('uv')
  const fall = new Float32Array(uv.count)
  const air = new Float32Array(uv.count)
  for (let i = 0; i < uv.count; i++) {
    const progress = uv.getY(i) / duration
    fall[i] = isSpill ? progress : 0
    air[i] = isSpill ? 0.05 + progress ** 2 * 0.65 : 0.25 + progress * 0.35
  }
  geometry.setAttribute('waterFall', new Float32BufferAttribute(fall, 1))
  geometry.setAttribute('waterAir', new Float32BufferAttribute(air, 1))
  return geometry
}
/** Open, curved spill ribbons rather than an enclosing cone. Gravity accelerates and narrows each stream. */
function spill(sheet: WaterSheet) {
  const duration = sheetFlightTime(sheet)
  const samples = 10
  const parts: Array<BufferGeometry> = []
  for (let stream = 0; stream < sheet.streams; stream++) {
    const positions: Array<number> = []
    const normals: Array<number> = []
    const uvs: Array<number> = []
    const indices: Array<number> = []
    for (let row = 0; row <= samples; row++) {
      const age = duration * row / samples
      const [radius, y] = sheetPoint(sheet, age)
      const width = sheet.width * (0.65 + 0.35 * Math.exp(-age * 4))
      const slope = gravity * age / sheet.outward
      const length = Math.hypot(slope, 1)
      for (const side of [0, 1]) {
        const angle = stream * Math.PI * 2 / sheet.streams + (side - 0.5) * width / radius
        positions.push(radius * Math.cos(angle), y, radius * Math.sin(angle))
        normals.push(Math.cos(angle) * slope / length, 1 / length, Math.sin(angle) * slope / length)
        uvs.push(side, age)
      }
      if (row === samples) {
        continue
      }
      const a = row * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    // One quad across each narrow ribbon is within 1 mm of its circular cross section.
    const geometry = new BufferGeometry
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    parts.push(waterPart(geometry, duration, true))
  }
  return mergeParts(parts)
}
function jetColumn(samples: number) {
  const rise = jet.speed ** 2 / (2 * gravity)
  const heights = Array.from({length: samples + 1}, (_, i) => rise * jet.solid * (1 - (1 - i / samples) ** 1.6))
  const age = (height: number) => (jet.speed - Math.sqrt(jet.speed ** 2 - 2 * gravity * height)) / gravity
  const radius = (height: number) => jet.radius * Math.sqrt(jet.speed / Math.sqrt(jet.speed ** 2 - 2 * gravity * height))
  const top = heights.at(-1)!
  const crown = radius(top)
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
function crownJets() {
  return Array.from({length: jet.fan.count}, (_, i) => {
    const curve = new CrownJetCurve(i * Math.PI * 2 / jet.fan.count)
    const geometry = new TubeGeometry(curve, 7, 0.007, 6, false)
    const length = curve.getLength()
    const uv = geometry.getAttribute('uv')
    for (let vertex = 0; vertex < uv.count; vertex++) {
      uv.setXY(vertex, uv.getY(vertex), curve.getUtoTmapping(uv.getX(vertex), uv.getX(vertex) * length) * curve.duration)
    }
    return waterPart(geometry, curve.duration, false)
  })
}
/** Small parabolic crown jets give the bubbler a floral silhouette without a dense particle plume. */
class CrownJetCurve extends Curve<Vector3> {
  readonly duration = (jet.fan.speed + Math.sqrt(jet.fan.speed ** 2 + 2 * gravity * (jet.y - pools.cup))) / gravity

  constructor(readonly angle: number) {
    super()
  }

  override getPoint(t: number, target = new Vector3) {
    const age = t * this.duration
    const radius = jet.radius + jet.fan.outward * age
    return target.set(radius * Math.cos(this.angle), jet.y + jet.fan.speed * age - gravity / 2 * age ** 2, radius * Math.sin(this.angle))
  }
}
const tazzaRim: SpillRim = {
  height: 1.932,
  rise: 0.03,
}
const cupRim: SpillRim = {
  height: 2.95,
  rise: 0.03,
}
function pool(apothem: number, sides: number, y: number, splash: number, streams: number, bowl?: {
  flutes: number
  profile: ReadonlyArray<ProfilePoint>
  rim: SpillRim
}) {
  const geometry = new CircleGeometry(apothem / Math.cos(Math.PI / sides), sides, Math.PI / sides)
  geometry.rotateX(-Math.PI / 2).translate(0, y, 0)
  if (bowl) {
    const position = geometry.getAttribute('position')
    for (let i = 1; i < position.count; i++) {
      const angle = Math.atan2(position.getZ(i), position.getX(i))
      const section = bowl.profile.map(point => carvedProfilePoint(point, angle, bowl.flutes, 0.045, bowl.rim))
      let radius = apothem
      for (let j = 1; j < section.length; j++) {
        const [ar, ay] = section[j - 1]
        const [br, by] = section[j]
        if (ay <= y && by > y) {
          radius = (ar + (br - ar) * (y - ay) / (by - ay)) / Math.cos(Math.PI / sides)
          break
        }
      }
      position.setXYZ(i, radius * Math.cos(angle), y, radius * Math.sin(angle))
    }
  }
  for (const [name, value] of Object.entries({
    splashRadius: splash,
    splashStreams: streams,
  })) {
    const values = new Float32Array(geometry.getAttribute('position').count)
    values.fill(value)
    geometry.setAttribute(name, new Float32BufferAttribute(values, 1))
  }
  return geometry
}

/** Two melon-fluted tazze on turned balusters, an octagonal molded basin and narrow bronze fillets. All parts merge by material. */
export default class FountainGeometry {
  static readonly profiles = profiles
  readonly brass: BufferGeometry
  readonly lining: BufferGeometry
  readonly pools: BufferGeometry
  readonly stone: BufferGeometry
  readonly water: BufferGeometry

  constructor() {
    this.stone = mergeParts([
      new RevolvedProfileGeometry(profiles.basin, {sides: 8}),
      new CarvedProfileGeometry(profiles.column, 72, 12, 0.045),
      new CarvedProfileGeometry(profiles.tazza, 96, 12, 0.045, tazzaRim),
      new CarvedProfileGeometry(profiles.stem, 48, 8, 0.045),
      new CarvedProfileGeometry(profiles.cup, 64, 8, 0.045, cupRim),
    ])
    const band = (r: number, y: number, height: number, sides: number, flutes = 0, slope = 0) => {
      const top = r + height * slope
      const profile: Array<ProfilePoint> = [[top - 0.008, y + height], [top + 0.003, y + height], [r + 0.003, y], [r - 0.008, y], [top - 0.008, y + height]]
      return flutes ? new CarvedProfileGeometry(profile, sides, flutes, 0.045) : new RevolvedProfileGeometry(profile, {sides})
    }
    this.brass = mergeParts([
      new RevolvedProfileGeometry(profiles.nozzle, {sides: 16}),
      band(1.89, 0.536, 0.008, 8, 0, 5 / 3),
      band(1.8575, 0.2, 0.01, 8, 0, -1.25),
      band(0.321, 0.89, 0.015, 72, 12),
      band(0.18, 2.604, 0.012, 48, 8),
    ])
    this.lining = new CircleGeometry(basinInnerApothem / Math.cos(Math.PI / 8), 8, Math.PI / 8)
    this.lining.rotateX(-Math.PI / 2).translate(0, basinFloor + 0.002, 0)
    this.pools = mergeParts([
      pool(basinInnerApothem + 0.004, 8, pools.basin, sheetLanding(spills.tazza), spills.tazza.streams),
      // Match the fluted lips; a few millimeters of overflow join each spill to its receiving pool.
      pool(spills.tazza.radius, 96, pools.tazza, sheetLanding(spills.cup), spills.cup.streams, {
        profile: profiles.tazza.slice(0, 6),
        flutes: 12,
        rim: tazzaRim,
      }),
      pool(spills.cup.radius, 64, pools.cup, 0, 0, {
        profile: profiles.cup.slice(0, 5),
        flutes: 8,
        rim: cupRim,
      }),
    ])
    this.water = mergeParts([spill(spills.tazza), spill(spills.cup), jetColumn(8), ...crownJets()])
  }

  dispose() {
    this.stone.dispose()
    this.brass.dispose()
    this.lining.dispose()
    this.pools.dispose()
    this.water.dispose()
  }
}

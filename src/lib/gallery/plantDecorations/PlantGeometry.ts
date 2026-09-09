import type {Blade} from './bladeGeometry.ts'
import type {PlantKind} from './catalog.ts'
import type {BufferGeometry} from 'three/webgpu'

import {CatmullRomCurve3, TubeGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {bladeGeometry} from './bladeGeometry.ts'

// Callbacks borrow builder-owned geometry before merging; clone any mesh to retain it.
export type PlantGeometryCapture = {
  blade: (geometry: BufferGeometry) => void
  branch: (geometry: BufferGeometry) => void
}

type Point = [number, number, number]
const radial = (angle: number, radius: number, y: number): Point => [Math.cos(angle) * radius, y, Math.sin(angle) * radius]

/** Deterministic botanical mesh builder. The root origin is the pot’s soil surface. */
export class PlantGeometry {
  readonly foliage: BufferGeometry
  readonly stems: BufferGeometry
  private readonly blades: Array<BufferGeometry> = []
  private readonly branches: Array<BufferGeometry> = []

  constructor(kind: PlantKind, private readonly capture?: PlantGeometryCapture) {
    this[kind]()
    this.foliage = mergeParts(this.blades)
    this.stems = mergeParts(this.branches)
    this.blades.length = 0
    this.branches.length = 0
  }

  dispose() {
    this.foliage.dispose()
    this.stems.dispose()
  }

  private blade(options: Blade) {
    const geometry = bladeGeometry(options)
    this.capture?.blade(geometry)
    this.blades.push(geometry)
  }

  private branch(points: Array<Point>, radius = 0.009) {
    const curve = new CatmullRomCurve3(points.map(point => new Vector3(...point)))
    // Straight stalks only need their two end rings; retain trunks and arching frond spines.
    let tubularSegments = points.length * 3
    if (points.length === 2) {
      tubularSegments = 1
    } else if (radius >= 0.02 || points.length >= 4) {
      tubularSegments = points.length * 5
    }
    const geometry = new TubeGeometry(curve, tubularSegments, radius, 6, false)
    // Taper gently toward the growing tip instead of using uniform wire-like tubes.
    const positions = geometry.getAttribute('position')
    const segments = geometry.parameters.tubularSegments
    for (let i = 0; i <= segments; i++) {
      const center = curve.getPointAt(i / segments)
      const taper = 1 - i / segments * 0.65
      for (let j = 0; j <= 6; j++) {
        const index = i * 7 + j
        positions.setXYZ(index, center.x + (positions.getX(index) - center.x) * taper, center.y + (positions.getY(index) - center.y) * taper, center.z + (positions.getZ(index) - center.z) * taper)
      }
    }
    geometry.computeVertexNormals()
    this.capture?.branch(geometry)
    this.branches.push(geometry)
    return curve
  }

  private calathea() {
    for (let i = 0; i < 13; i++) {
      const angle = i * 2.4
      const y = 0.2 + i % 4 * 0.085
      const at = radial(angle, 0.11 + i % 3 * 0.035, y)
      this.branch([radial(angle, 0.035, -0.04), radial(angle, 0.085, y * 0.6), at], 0.008)
      this.blade({
        at,
        direction: radial(angle, 0.7, 0.65),
        length: 0.36,
        width: 0.29,
        bend: -0.07,
        roll: -angle - Math.PI / 2,
        style: 'silver',
        color: '#4a7154',
      })
    }
  }

  private fern() {
    for (let i = 0; i < 15; i++) {
      const angle = i * 2.4
      const height = 0.38 + i % 3 * 0.07
      const curve = this.branch([radial(angle, 0.03, -0.025), radial(angle, 0.16, height), radial(angle, 0.42, height * 0.92), radial(angle, 0.62, height * 0.48)], 0.005)
      for (let j = 0; j < 15; j++) {
        const t = 0.2 + j * 0.052
        const point = curve.getPoint(t)
        for (const side of [-1, 1]) {
          this.blade({
            at: point.toArray(),
            direction: radial(angle + side * 1.02, 1, 0.12),
            length: 0.17 * Math.sin((j + 3) / 19 * Math.PI),
            width: 0.035,
            bend: -0.032,
            style: 'lance',
            roll: -angle - Math.PI / 2,
            color: j % 2 ? '#4f7e3d' : '#789747',
          })
        }
      }
    }
  }

  private fig() {
    this.branch([[0, -0.04, 0], [-0.035, 0.6, 0.01], [0.025, 1.16, 0], [0.01, 1.5, 0.04]], 0.033)
    for (let i = 0; i < 13; i++) {
      const angle = i * 2.4
      const y = 0.47 + i * 0.077
      const tip = radial(angle, 0.16 + i % 3 * 0.05, y + 0.09)
      this.branch([[0, y - 0.15, 0], radial(angle, 0.1, y), tip], 0.013)
      this.blade({
        at: tip,
        direction: radial(angle, 0.7, 0.65),
        length: 0.46,
        width: 0.35,
        bend: -0.09,
        roll: -angle - Math.PI / 2,
        style: 'fiddle',
        color: i % 3 ? '#375535' : '#527044',
      })
    }
  }

  private jade() {
    this.branch([[0, -0.035, 0], [0.075, 0.24, 0.01], [0.02, 0.49, 0], [0.07, 0.7, 0]], 0.047)
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.4
      const y = 0.22 + i * 0.055
      const tip = radial(angle, 0.28, y + 0.16)
      this.branch([[0.04, y, 0], radial(angle, 0.14, y + 0.05), tip], 0.021)
      for (let j = 0; j < 7; j++) {
        const a = j * 2.4 + angle
        this.blade({
          at: [tip[0], tip[1] + j % 3 * 0.036, tip[2]],
          direction: radial(a, 0.65, 0.8),
          length: 0.14,
          width: 0.095,
          bend: 0.01,
          roll: -a - Math.PI / 2,
          style: 'succulent',
          color: j % 3 ? '#507553' : '#759563',
        })
      }
    }
  }

  private palm() {
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.4
      const height = 0.92 + i % 3 * 0.17
      const curve = this.branch([radial(angle, 0.055, -0.04), radial(angle, 0.1, height * 0.56), radial(angle, 0.39, height), radial(angle, 0.67, height * 0.9)], 0.012)
      for (let j = 0; j < 13; j++) {
        const t = 0.32 + j * 0.05
        const point = curve.getPoint(t)
        for (const side of [-1, 1]) {
          const direction = radial(angle + side * 0.96, 0.9, 0.16 - j * 0.015)
          this.blade({
            at: point.toArray(),
            direction,
            length: 0.29 * Math.sin((j + 2) / 16 * Math.PI),
            width: 0.035,
            bend: -0.075,
            roll: -angle - Math.PI / 2,
            style: 'lance',
            color: j % 3 ? '#45693c' : '#718b48',
          })
        }
      }
    }
  }

  private philodendron() {
    for (let i = 0; i < 11; i++) {
      const angle = i * 2.4
      const height = 0.38 + i % 4 * 0.14
      const tip = radial(angle, 0.2 + i % 3 * 0.025, height)
      this.branch([[0, -0.04, 0], radial(angle, 0.1, height * 0.55), tip], 0.013)
      this.blade({
        at: tip,
        direction: radial(angle, 0.8, 0.38),
        length: 0.55,
        width: 0.42,
        bend: -0.13,
        roll: -angle - Math.PI / 2,
        style: 'split',
        color: i % 3 ? '#2f5d38' : '#547b42',
      })
    }
  }

  private rubber() {
    this.branch([[0, -0.04, 0], [0.025, 0.5, 0], [-0.025, 1.2, 0]], 0.024)
    for (let i = 0; i < 12; i++) {
      const angle = i * 2.4
      const y = 0.21 + i * 0.079
      const at = radial(angle, 0.095, y)
      this.branch([[0, y - 0.065, 0], at], 0.009)
      this.blade({
        at,
        direction: radial(angle, 0.9, 0.4),
        length: 0.36,
        width: 0.19,
        bend: -0.085,
        roll: -angle - Math.PI / 2,
        color: i % 3 ? '#35463b' : '#623943',
      })
    }
    this.blade({
      at: [0, 1.13, 0],
      direction: [0.15, 1, 0],
      length: 0.23,
      width: 0.035,
      style: 'lance',
      color: '#99564e',
    })
  }

  private snake() {
    for (let i = 0; i < 15; i++) {
      const angle = i * 2.4
      const radius = i < 5 ? 0.05 : 0.16
      const at = radial(angle, radius, -0.035)
      this.branch([at, radial(angle, radius, 0.07)], 0.009)
      this.blade({
        at,
        direction: radial(angle, 0.12 + i % 3 * 0.065, 1),
        length: 0.73 + i % 5 * 0.13,
        width: 0.12,
        bend: 0.045,
        roll: angle,
        style: 'gold',
        color: '#3e6145',
      })
    }
  }
}

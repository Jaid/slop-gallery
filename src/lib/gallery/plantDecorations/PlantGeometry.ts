import type {PlantKind} from './catalog.ts'

import {BufferGeometry, CatmullRomCurve3, Color, Float32BufferAttribute, Matrix4, Quaternion, SphereGeometry, TubeGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {sampleGrid} from './geometry.ts'

type Point = [number, number, number]
type BladeStyle = 'fiddle' | 'gold' | 'lance' | 'oval' | 'silver' | 'split' | 'succulent'
type Blade = {
  at: Point
  bend?: number
  color?: string
  direction: Point
  length: number
  roll?: number
  style?: BladeStyle
  width: number
}
const up = new Vector3(0, 1, 0)
const radial = (angle: number, radius: number, y: number): Point => [Math.cos(angle) * radius, y, Math.sin(angle) * radius]

/** Deterministic botanical mesh builder. The root origin is the pot’s soil surface. */
export class PlantGeometry {
  readonly foliage: BufferGeometry
  readonly stems: BufferGeometry
  private readonly blades: Array<BufferGeometry> = []
  private readonly branches: Array<BufferGeometry> = []

  constructor(kind: PlantKind) {
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

  private blade({at, direction, length, width, bend = 0.12, roll = 0, color = '#37623b', style = 'oval'}: Blade) {
    let rows = 24
    if (style === 'split') {
      rows = 48
    }
    if (style === 'lance') {
      rows = 12
    }
    const columns = style === 'lance' ? 4 : 12
    const positions: Array<number> = []
    const colors: Array<number> = []
    const uvs: Array<number> = []
    const indices: Array<number> = []
    const base = new Color(color)
    const pale = new Color('#78905c')
    if (style === 'gold') {
      pale.set('#c1ad53')
    }
    if (style === 'silver') {
      pale.set('#a0b693')
    }
    const transform = (new Matrix4).compose(new Vector3(...at), (new Quaternion).setFromUnitVectors(up, new Vector3(...direction).normalize()).multiply((new Quaternion).setFromAxisAngle(up, roll)), new Vector3(1, 1, 1))
    if (style === 'succulent') {
      const geometry = new SphereGeometry(1, 12, 8).scale(width / 2, length / 2, width * 0.22).translate(0, length / 2, 0)
      const fleshyPositions = geometry.getAttribute('position')
      const fleshyColors: Array<number> = []
      for (let i = 0; i < fleshyPositions.count; i++) {
        const tint = base.clone().multiplyScalar(0.86 + fleshyPositions.getY(i) / length * 0.2)
        fleshyColors.push(tint.r, tint.g, tint.b)
      }
      geometry.setAttribute('color', new Float32BufferAttribute(fleshyColors, 3))
      geometry.applyMatrix4(transform)
      this.blades.push(geometry)
      return
    }
    for (let row = 0; row <= rows; row++) {
      const t = row / rows
      let profile = Math.sin(Math.PI * t) ** (style === 'lance' || style === 'gold' ? 0.65 : 0.8)
      if (style === 'split') {
        profile *= (0.32 + 0.68 * Math.abs(Math.sin(t * Math.PI * 6))) * (1 - 0.3 * t)
      }
      if (style === 'fiddle') {
        profile *= 0.76 + 0.24 * Math.cos(t * Math.PI * 3)
      }
      // A tiny terminal width avoids zero-area triangles at the root and tip.
      profile = Math.max(0.002, profile)
      for (let column = 0; column <= columns; column++) {
        const s = column / columns * 2 - 1
        const fold = (1 - Math.abs(s)) * width * 0.16 * Math.sin(Math.PI * t)
        const wave = Math.abs(s) ** 2 * Math.sin(t * 28) * width * (style === 'split' ? 0.065 : 0.015)
        const point = new Vector3(s * width * profile / 2, t * length, bend * t * t + fold + wave).applyMatrix4(transform)
        positions.push(...point)
        uvs.push(column / columns, t)
        const vein = Math.exp(-Math.abs(s) * 35) * 0.32
        const sideVeins = Math.max(0, Math.cos((t - Math.abs(s) * 0.13) * Math.PI * 18)) ** 18 * 0.12
        let pattern = vein + sideVeins
        if (style === 'silver') {
          pattern += (0.5 + Math.cos((t - Math.abs(s) * 0.22) * 42) * 0.5) ** 3 * 0.68
        }
        if (style === 'gold') {
          pattern = Math.abs(s) > 0.8 ? 0.9 : 0.13 + Math.sin(t * 90 + s * 3) * 0.11
        }
        const shade = 0.85 + 0.15 * Math.sin(t * Math.PI) + Math.abs(s) * 0.08
        const tint = base.clone().lerp(pale, Math.min(0.92, pattern)).multiplyScalar(shade)
        colors.push(tint.r, tint.g, tint.b)
        if (row < rows && column < columns) {
          const a = row * (columns + 1) + column
          const b = a + columns + 1
          indices.push(a, a + 1, b, a + 1, b + 1, b)
        }
      }
    }
    const geometry = new BufferGeometry
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    // Sample the dense grid’s normals too, so fewer faces do not flatten the original shading.
    geometry.computeVertexNormals()
    // Keep the full outline and the narrow midrib; flat areas need far fewer columns.
    let sampledColumns = [0, 5, 6, 7, 12]
    if (style === 'silver') {
      sampledColumns = [0, 2, 4, 5, 6, 7, 8, 10, 12]
    }
    if (style === 'gold') {
      sampledColumns = [0, 1, 2, 6, 10, 11, 12]
    }
    if (style === 'lance') {
      sampledColumns = [0, 2, 4]
    }
    const sampledRows = style === 'lance' ? [0, 1, 2, 4, 6, 8, 10, 11, 12] : Array.from({length: rows + 1}, (_, row) => row)
    this.blades.push(sampleGrid(geometry, columns, sampledRows, sampledColumns))
    geometry.dispose()
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

import {BufferGeometry, Color, Float32BufferAttribute, Matrix4, Quaternion, SphereGeometry, Vector3} from 'three/webgpu'

import {sampleGrid} from './geometry.ts'

export type Blade = {
  at: Point
  bend?: number
  color?: string
  direction: Point
  length: number
  roll?: number
  style?: BladeStyle
  width: number
}
type Point = [number, number, number]
type BladeStyle = 'fiddle' | 'gold' | 'lance' | 'oval' | 'silver' | 'split' | 'succulent'
const up = new Vector3(0, 1, 0)

export function bladeGeometry({at, direction, length, width, bend = 0.12, roll = 0, color = '#37623b', style = 'oval'}: Blade) {
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
    return geometry
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
  const sampled = sampleGrid(geometry, columns, sampledRows, sampledColumns)
  geometry.dispose()
  return sampled
}


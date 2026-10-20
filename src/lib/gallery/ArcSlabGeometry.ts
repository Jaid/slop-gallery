import {BufferGeometry, Float32BufferAttribute} from 'three/webgpu'

export type ArcSlabOptions = {
  /** first and last angle around the z axis, measured from +x toward +y, in radians */
  angles: readonly [number, number]
  /** inner and outer distance from the axis */
  radii: readonly [number, number]
  /** segments along the arc; defaults to keeping the outer face within 5 mm of its circle */
  segments?: number
  /** start and end along the axis */
  z: readonly [number, number]
}

const vertex = (values: Array<number>, index: number) => values.slice(index * 3, index * 3 + 3)
const segmentsFor = (radius: number, sweep: number) => Math.max(1, Math.ceil(sweep / (2 * Math.acos(1 - Math.min(1, 0.005 / radius)))))

/**
 * A closed slab bent around the z axis: the solid between two concentric cylinders, two angles and two planes across the axis.
 *
 * The curved faces are shaded smooth around the arc with analytic normals, every edge between faces stays hard. Vaults, ribs,
 * coffer frames and glazing bars of a barrel vault are all such slabs, from wide and thin to narrow and deep.
 */
export default class ArcSlabGeometry extends BufferGeometry {
  override readonly type = 'ArcSlabGeometry'

  constructor({angles: [start, end], radii: [inner, outer], segments, z: [front, back]}: ArcSlabOptions) {
    super()
    if (![start, end, inner, outer, front, back].every(Number.isFinite) || !(end > start) || end - start > Math.PI * 2 || !(inner >= 0) || !(outer > inner) || !(back > front)) {
      throw new RangeError('An arc slab needs increasing angles within one turn, increasing non-negative radii and an increasing z range.')
    }
    const count = segments ?? segmentsFor(outer, end - start)
    if (!Number.isInteger(count) || count < 1) {
      throw new RangeError('An arc slab needs a whole, positive number of segments.')
    }
    const positions: Array<number> = []
    const normals: Array<number> = []
    const uvs: Array<number> = []
    const indices: Array<number> = []
    const angleAt = (i: number) => start + (end - start) * i / count
    /** Adds a quad strip and winds every triangle so it faces along its normal. */
    const strip = (points: Array<readonly [number, number, number]>, normal: (i: number) => readonly [number, number, number], uv: (i: number) => readonly [number, number], rows: number) => {
      const base = positions.length / 3
      for (const [i, point] of points.entries()) {
        positions.push(...point)
        normals.push(...normal(i))
        uvs.push(...uv(i))
      }
      const columns = points.length / rows
      for (let column = 0; column < columns - 1; column++) {
        for (let row = 0; row < rows - 1; row++) {
          const a = base + column * rows + row
          const b = a + rows
          const c = b + 1
          const d = a + 1
          for (const [i, j, k] of [[a, b, c], [a, c, d]] as const) {
            const [pa, pb, pc] = [vertex(positions, i), vertex(positions, j), vertex(positions, k)]
            const u = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]]
            const v = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]]
            const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
            // A slab reaching the axis closes its ends with fans; the quads there collapse into one triangle each.
            if (Math.hypot(...cross) < 1e-12) {
              continue
            }
            const n = vertex(normals, i)
            if (cross[0] * n[0] + cross[1] * n[1] + cross[2] * n[2] >= 0) {
              indices.push(i, j, k)
            } else {
              indices.push(i, k, j)
            }
          }
        }
      }
    }
    const ring = Array.from({length: count + 1}, (_, i) => angleAt(i))
    const arcLength = (radius: number, i: number) => radius * (ring[i] - start)
    for (const [radius, sign] of [[inner, -1], [outer, 1]] as const) {
      // Curved faces: columns run around the arc, each with a vertex at the front and the back.
      if (radius === 0) {
        continue
      }
      strip(ring.flatMap(angle => [[radius * Math.cos(angle), radius * Math.sin(angle), front], [radius * Math.cos(angle), radius * Math.sin(angle), back]] as const), i => {
        const angle = ring[Math.floor(i / 2)]
        return [sign * Math.cos(angle), sign * Math.sin(angle), 0]
      }, i => [arcLength(radius, Math.floor(i / 2)), i % 2 ? back - front : 0], 2)
    }
    for (const [z, sign] of [[front, -1], [back, 1]] as const) {
      // Flat ends across the axis.
      strip(ring.flatMap(angle => [[inner * Math.cos(angle), inner * Math.sin(angle), z], [outer * Math.cos(angle), outer * Math.sin(angle), z]] as const), () => [0, 0, sign], i => {
        const angle = ring[Math.floor(i / 2)]
        const radius = i % 2 ? outer : inner
        return [radius * Math.cos(angle), radius * Math.sin(angle)]
      }, 2)
    }
    // A full ring closes on itself and needs no sides.
    const sides = end - start < Math.PI * 2 - 1e-9 ? [[start, -1], [end, 1]] as const : []
    for (const [angle, sign] of sides) {
      // Radial sides at both ends of the arc face along the arc, away from the slab.
      const points = [[inner, front], [outer, front], [inner, back], [outer, back]].map(([radius, z]) => [radius * Math.cos(angle), radius * Math.sin(angle), z] as const)
      strip(points, () => [-sign * Math.sin(angle), sign * Math.cos(angle), 0], i => [i % 2 ? outer - inner : 0, i < 2 ? 0 : back - front], 2)
    }
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    this.setIndex(indices)
    this.computeBoundingBox()
    this.computeBoundingSphere()
  }
}

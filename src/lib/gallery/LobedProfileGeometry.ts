import {BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute, Vector3} from 'three/webgpu'

/** [mean distance from the axis, height, scallop depth, lobe dip]: the radius swells by the scallop on the lobes and shrinks by it in the hollows between them, where the height sinks by the dip. */
export type LobedProfilePoint = readonly [number, number, number, number]

export type LobedProfileOptions = {
  /** number of lobes around the axis */
  lobes: number
  /** angle of the first lobe’s crest from +x, in radians */
  phase?: number
  /** polygon sides per lobe */
  segmentsPerLobe?: number
  /** Creases along the profile below this angle are shaded smooth (radians). */
  smoothAngle?: number
  /** Per profile point and corner fraction (0–1 around the axis); defaults to corner fraction and profile arc length. */
  uv?: (point: number, around: number) => readonly [number, number]
}

const defaultSmoothAngle = 40 * Math.PI / 180

/**
 * Sweeps a 2D profile around the y axis as a smooth, lobed surface, like a gadrooned bowl or a scalloped lip.
 *
 * The profile runs from the axis outward with the solid on its right, like RevolvedProfileGeometry. Every point gives a mean radius and how much the surface swells and sinks on the lobes: at a crest the radius grows by the scallop, in a hollow it shrinks by it and the height drops by the dip. Sharp turns along the profile keep hard creases; everything else is shaded smooth, with no seam around the axis.
 */
export default class LobedProfileGeometry extends BufferGeometry {
  override readonly type = 'LobedProfileGeometry'

  constructor(profile: ReadonlyArray<LobedProfilePoint>, {lobes, phase = 0, segmentsPerLobe = 5, smoothAngle = defaultSmoothAngle, uv}: LobedProfileOptions) {
    super()
    if (!Number.isInteger(lobes) || lobes < 2 || !Number.isInteger(segmentsPerLobe) || segmentsPerLobe < 2) {
      throw new RangeError('A lobed profile needs at least two lobes of at least two segments each.')
    }
    if (profile.length < 2 || profile.some(([radius, y, scallop, dip]) => !(radius >= 0) || !Number.isFinite(y) || !Number.isFinite(scallop) || !Number.isFinite(dip) || Math.abs(scallop) > radius + 1e-9)) {
      throw new RangeError('A lobed profile needs at least two finite points whose scallops do not cross the axis.')
    }
    const sides = lobes * segmentsPerLobe
    // A ring closes with a duplicate of its first vertex, so UV u runs the full 0–1 without a wrapping quad.
    const ringLength = sides + 1
    const lengths = [0]
    for (let i = 1; i < profile.length; i++) {
      lengths.push(lengths[i - 1] + Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]))
    }
    const textureAt = uv ?? ((point: number, around: number) => [around, lengths[point] / lengths.at(-1)!] as const)
    // Mean segment directions decide which joins are creases, like on a plain lathe.
    const directions = profile.slice(1).map((end, i) => {
      const start = profile[i]
      const length = Math.hypot(end[0] - start[0], end[1] - start[1])
      return length > 1e-9 ? [(end[0] - start[0]) / length, (end[1] - start[1]) / length] as const : null
    })
    const creased = (point: number) => {
      const before = directions[point - 1]
      const after = directions[point]
      if (!before || !after) {
        return false
      }
      return Math.acos(Math.min(1, Math.max(-1, before[0] * after[0] + before[1] * after[1]))) >= smoothAngle
    }
    const positions: Array<number> = []
    const uvs: Array<number> = []
    // A profile point owns one ring of vertices, or two at a crease: one for the segment before it and one for the one after.
    const ringBefore: Array<number> = []
    const ringAfter: Array<number> = []
    let rings = 0
    const pushRing = (point: number) => {
      const [radius, y, scallop, dip] = profile[point]
      for (let side = 0; side < ringLength; side++) {
        const angle = side / sides * Math.PI * 2
        const lobe = Math.cos(lobes * (angle - phase))
        const r = radius + scallop * lobe
        positions.push(r * Math.cos(angle), y + dip * (1 - lobe) / 2, -r * Math.sin(angle))
        uvs.push(...textureAt(point, side / sides))
      }
      return rings++
    }
    for (let point = 0; point < profile.length; point++) {
      const ring = pushRing(point)
      ringBefore.push(ring)
      ringAfter.push(creased(point) ? pushRing(point) : ring)
    }
    const indices: Array<number> = []
    const a = new Vector3
    const b = new Vector3
    const c = new Vector3
    const outward = new Vector3
    const vertex = (ring: number, side: number) => ring * ringLength + side
    const at = (index: number, target: Vector3) => target.set(positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2])
    for (const [j, direction] of directions.entries()) {
      if (!direction) {
        continue
      }
      const start = ringAfter[j]
      const end = ringBefore[j + 1]
      const startOnAxis = profile[j][0] === 0 && profile[j][2] === 0
      const endOnAxis = profile[j + 1][0] === 0 && profile[j + 1][2] === 0
      for (let side = 0; side < sides; side++) {
        const quad = [vertex(start, side), vertex(start, side + 1), vertex(end, side + 1), vertex(end, side)]
        let triangles = [[0, 1, 2], [0, 2, 3]]
        if (startOnAxis) {
          triangles = [[0, 2, 3]]
        } else if (endOnAxis) {
          triangles = [[0, 1, 2]]
        }
        // The solid lies to the right of the profile, so the surface faces the left of travel.
        const facing = (side + 0.5) / sides * Math.PI * 2
        outward.set(-direction[1] * Math.cos(facing), direction[0], direction[1] * Math.sin(facing))
        for (const triangle of triangles) {
          at(quad[triangle[0]], a)
          at(quad[triangle[1]], b).sub(a)
          at(quad[triangle[2]], c).sub(a)
          const winding = b.cross(c).dot(outward) >= 0 ? triangle : triangle.toReversed()
          indices.push(...winding.map(corner => quad[corner]))
        }
      }
    }
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    this.setIndex(new Uint32BufferAttribute(indices, 1))
    this.computeVertexNormals()
    const normals = this.getAttribute('normal')
    // The seam’s two vertices each saw only one side’s faces; they share the mean of both, so the seam shades like any other edge.
    for (let ring = 0; ring < rings; ring++) {
      const first = vertex(ring, 0)
      const last = vertex(ring, sides)
      a.fromBufferAttribute(normals, first).add(b.fromBufferAttribute(normals, last)).normalize()
      normals.setXYZ(first, a.x, a.y, a.z)
      normals.setXYZ(last, a.x, a.y, a.z)
    }
    // A ring on the axis collapses to one point whose vertices each touch a single face; they share the mean normal instead.
    for (const [point, [radius, , scallop]] of profile.entries()) {
      if (radius !== 0 || scallop !== 0) {
        continue
      }
      for (const ring of new Set([ringBefore[point], ringAfter[point]])) {
        outward.set(0, 0, 0)
        for (let side = 0; side < ringLength; side++) {
          outward.add(a.fromBufferAttribute(normals, vertex(ring, side)))
        }
        outward.normalize()
        for (let side = 0; side < ringLength; side++) {
          normals.setXYZ(vertex(ring, side), outward.x, outward.y, outward.z)
        }
      }
    }
    this.computeBoundingBox()
    this.computeBoundingSphere()
  }
}

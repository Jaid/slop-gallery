import type {ProfilePoint} from './RevolvedProfileGeometry.ts'

import {BufferGeometry, Float32BufferAttribute, Vector3} from 'three/webgpu'

export type ShapedLatheOptions = {
  /** Steps around the axis; the surface is smooth around it, so this is only a matter of tessellation. */
  segments: number
  /**
   * Moves profile point `point` at `angle` (radians, from +x toward +z) away from its plain revolved place, e.g. into lobes, gadroons or notches.
   * Returns its [distance from the axis, height]. Defaults to the profile point itself, a plain surface of revolution.
   */
  shape?: (point: number, angle: number) => ProfilePoint
  /** Profile turns sharper than this become a hard arris instead of being shaded smooth (radians). */
  smoothAngle?: number
  /** UV of profile point `point` at the fraction `around` of the turn; defaults to `around` and the profile’s arc length. */
  uv?: (point: number, around: number) => readonly [number, number]
}

const defaultSmoothAngle = 40 * Math.PI / 180
/** angle between two unit directions, or a full turn back where either is missing */
const turn = (a: readonly [number, number] | null, b: readonly [number, number] | null) => (a && b ? Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1]))) : Math.PI)
/** angular step for the tangent around the axis */
const epsilon = 1e-4

/**
 * Sweeps a profile around the y axis as a smooth surface whose cross sections may vary with the angle, for lobed basins, gadrooned bowls and notched lips.
 *
 * Like {@link RevolvedProfileGeometry}, the profile runs from the axis outward with the solid on the right of travel, and a profile turn sharper
 * than `smoothAngle` becomes a crisp carved arris. Normals come from the shaped surface itself, so lobes and gadroons shade correctly, and every
 * face is wound to match them. A profile whose last point equals its first closes into a ring, like the cross section of a torus.
 */
export default class ShapedLatheGeometry extends BufferGeometry {
  override readonly type = 'ShapedLatheGeometry'

  constructor(profile: ReadonlyArray<ProfilePoint>, {segments, shape = point => profile[point], smoothAngle = defaultSmoothAngle, uv}: ShapedLatheOptions) {
    super()
    if (!Number.isInteger(segments) || segments < 3) {
      throw new RangeError('A shaped lathe needs at least three segments.')
    }
    if (profile.length < 2 || profile.some(([radius, y]) => !(radius >= 0) || !Number.isFinite(y))) {
      throw new RangeError('A shaped lathe needs at least two finite points that do not cross the axis.')
    }
    const closed = profile.length > 2 && profile[0][0] === profile.at(-1)![0] && profile[0][1] === profile.at(-1)![1]
    const lengths = [0]
    for (let i = 1; i < profile.length; i++) {
      lengths.push(lengths[i - 1] + Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]))
    }
    const textureAt = uv ?? ((point: number, around: number) => [around, lengths[point] / lengths.at(-1)!] as const)
    // Unit directions of the plain profile’s segments, to tell smooth bends from arrises.
    const directions = profile.slice(1).map((end, i) => {
      const start = profile[i]
      const length = Math.hypot(end[0] - start[0], end[1] - start[1])
      return length > 1e-9 ? [(end[0] - start[0]) / length, (end[1] - start[1]) / length] as const : null
    })
    // Split the profile into runs that are smooth inside; neighboring runs share a point but not its vertices, which keeps arrises crisp.
    const breaks = [0]
    for (let i = 1; i < profile.length - 1; i++) {
      if (turn(directions[i - 1], directions[i]) >= smoothAngle) {
        breaks.push(i)
      }
    }
    breaks.push(profile.length - 1)
    const closedSmooth = closed && turn(directions.at(-1)!, directions[0]) < smoothAngle
    const place = (point: number, angle: number, target: Vector3) => {
      const [radius, y] = shape(point, angle)
      return target.set(radius * Math.cos(angle), y, radius * Math.sin(angle))
    }
    const positions: Array<number> = []
    const normals: Array<number> = []
    const uvs: Array<number> = []
    const indices: Array<number> = []
    const here = new Vector3
    const previous = new Vector3
    const next = new Vector3
    const along = new Vector3
    const step = new Vector3
    const around = new Vector3
    const normal = new Vector3
    const plain = new Vector3
    const face = new Vector3
    const a = new Vector3
    const b = new Vector3
    for (let run = 0; run < breaks.length - 1; run++) {
      const first = breaks[run]
      const last = breaks[run + 1]
      const base = positions.length / 3
      for (let point = first; point <= last; point++) {
        for (let segment = 0; segment <= segments; segment++) {
          const fraction = segment / segments
          const angle = fraction * 2 * Math.PI
          place(point, angle, here)
          positions.push(here.x, here.y, here.z)
          uvs.push(...textureAt(point, fraction))
          // Tangent along the profile: the mean of the shaped neighbors within the run, or across the closing point of a smooth ring.
          along.set(0, 0, 0)
          const before = point > first ? point - 1 : (closedSmooth && point === 0 ? profile.length - 2 : -1)
          const after = point < last ? point + 1 : (closedSmooth && point === profile.length - 1 ? 1 : -1)
          if (before >= 0) {
            along.add(step.subVectors(here, place(before, angle, previous)).normalize())
          }
          if (after >= 0) {
            along.add(step.subVectors(place(after, angle, next), here).normalize())
          }
          place(point, angle + epsilon, next)
          place(point, angle - epsilon, previous)
          around.subVectors(next, previous)
          // The outside of the plain profile, left of travel, decides which way the shaped normal faces.
          const direction = directions[Math.min(point, directions.length - 1)] ?? directions.find(Boolean)!
          plain.set(-direction[1] * Math.cos(angle), direction[0], -direction[1] * Math.sin(angle))
          normal.crossVectors(around, along)
          if (normal.lengthSq() < 1e-14 || around.lengthSq() < 1e-14) {
            // On the axis the surface turns flat: its normal is the profile’s own.
            normal.copy(plain)
          }
          normal.normalize()
          if (normal.dot(plain) < 0) {
            normal.negate()
          }
          normals.push(normal.x, normal.y, normal.z)
        }
      }
      const columns = segments + 1
      for (let row = 0; row < last - first; row++) {
        for (let segment = 0; segment < segments; segment++) {
          const p = base + row * columns + segment
          const quad = [p, p + 1, p + columns + 1, p + columns]
          for (const triangle of [[quad[0], quad[1], quad[2]], [quad[0], quad[2], quad[3]]]) {
            const [i, j, k] = triangle
            a.fromArray(positions, j * 3).sub(here.fromArray(positions, i * 3))
            b.fromArray(positions, k * 3).sub(here)
            face.crossVectors(a, b)
            // Collapsed triangles at the axis carry no surface.
            if (face.lengthSq() < 1e-16) {
              continue
            }
            normal.fromArray(normals, i * 3).add(step.fromArray(normals, j * 3)).add(step.fromArray(normals, k * 3))
            indices.push(...face.dot(normal) >= 0 ? triangle : [i, k, j])
          }
        }
      }
    }
    this.setIndex(indices)
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    this.computeBoundingBox()
    this.computeBoundingSphere()
  }
}

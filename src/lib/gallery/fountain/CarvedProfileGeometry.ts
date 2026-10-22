import type {ProfilePoint} from '../RevolvedProfileGeometry.ts'

import RevolvedProfileGeometry from '../RevolvedProfileGeometry.ts'

export type SpillRim = {
  height: number
  rise: number
}

/** Cross section at a given azimuth, shared by the stone and the fitted water perimeter. */
export function carvedProfilePoint([radius, y]: ProfilePoint, angle: number, flutes: number, depth: number, rim?: SpillRim): ProfilePoint {
  const t = rim ? Math.min(1, Math.max(0, (y - rim.height + 0.08) / 0.08)) : 0
  const lift = rim ? rim.rise * t ** 2 * (3 - 2 * t) : 0
  return [radius * (1 + depth * Math.cos(flutes * angle)), y + lift * (1 - Math.cos(flutes * angle)) / 2]
}

/** A melon-fluted lathe with optional shallow spill notches. Analytic inverse-transpose normals preserve the molding creases. */
export default class CarvedProfileGeometry extends RevolvedProfileGeometry {
  constructor(profile: ReadonlyArray<ProfilePoint>, sides: number, flutes: number, depth: number, rim?: SpillRim) {
    if (!Number.isInteger(flutes) || flutes < 1 || !(depth >= 0 && depth < 1) || rim && (!Number.isFinite(rim.height) || !(rim.rise >= 0 && Number.isFinite(rim.rise)))) {
      throw new RangeError('Carving needs positive integer flutes, a depth in [0, 1) and a finite, nonnegative rim lift.')
    }
    super(profile, {sides})
    const position = this.getAttribute('position')
    const normal = this.getAttribute('normal')
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const z = position.getZ(i)
      const radius = Math.hypot(x, z)
      if (radius < 1e-8) {
        continue
      }
      const angle = Math.atan2(z, x)
      const cosine = x / radius
      const sine = z / radius
      const scale = 1 + depth * Math.cos(flutes * angle)
      const derivative = -depth * flutes * Math.sin(flutes * angle)
      const radial = normal.getX(i) * cosine + normal.getZ(i) * sine
      const tangent = -normal.getX(i) * sine + normal.getZ(i) * cosine
      const y = position.getY(i)
      // Lift the lip between the lobes, retaining low spill saddles exactly at the stream azimuths.
      const t = rim ? Math.min(1, Math.max(0, (y - rim.height + 0.08) / 0.08)) : 0
      const lift = rim ? rim.rise * t ** 2 * (3 - 2 * t) : 0
      const liftDerivative = rim ? rim.rise * 6 * t * (1 - t) / 0.08 : 0
      const saddle = (1 - Math.cos(flutes * angle)) / 2
      const saddleDerivative = flutes * Math.sin(flutes * angle) / 2
      const nr = radial / scale
      const ny = normal.getY(i) / (1 + liftDerivative * saddle)
      const nt = tangent / scale - derivative * radial / scale ** 2 - lift * saddleDerivative * ny / (radius * scale)
      const length = Math.hypot(nr, nt, ny)
      normal.setXYZ(i, (nr * cosine - nt * sine) / length, ny / length, (nr * sine + nt * cosine) / length)
      position.setXYZ(i, x * scale, y + lift * saddle, z * scale)
    }
    this.computeBoundingBox()
    this.computeBoundingSphere()
  }
}

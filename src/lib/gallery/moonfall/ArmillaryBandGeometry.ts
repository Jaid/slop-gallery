import {LatheGeometry, Vector2} from 'three/webgpu'

/** the cross-section of the orbital sculpture’s bands: how wide each is across the ring, how thick from inside to outside and how far its arrises are chamfered */
export const armillaryBand = {
  width: 0.06,
  thickness: 0.01,
  chamfer: 0.0018,
}

/**
 * A flat band ring like an armillary sphere’s, in the x/y plane round the origin like a `TorusGeometry`: its broad faces look in and out, its narrow edges along z.
 */
export default function armillaryBandGeometry(radius: number, segments: number) {
  const {chamfer, thickness, width} = armillaryBand
  const inner = radius - thickness / 2
  const outer = radius + thickness / 2
  const half = width / 2
  const profile = [
    [inner + chamfer, -half],
    [outer - chamfer, -half],
    [outer, -half + chamfer],
    [outer, half - chamfer],
    [outer - chamfer, half],
    [inner + chamfer, half],
    [inner, half - chamfer],
    [inner, -half + chamfer],
    [inner + chamfer, -half],
  ].map(([r, y]) => new Vector2(r, y))
  const band = new LatheGeometry(profile, segments)
  band.computeVertexNormals()
  // A lathe turns round y; the sculpture’s rings lie in x/y round z.
  return band.rotateX(Math.PI / 2)
}

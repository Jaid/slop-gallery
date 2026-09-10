import {TorusKnotGeometry, Vector3} from 'three/webgpu'

// Preserve the knot’s radius, tube thickness and winding; only tessellation changes.
export const knotGeometryArgs = [0.45, 0.13, 256, 64, 2, 3] satisfies ConstructorParameters<typeof TorusKnotGeometry>

/** Smooth tangents are required by anisotropic finishes; derivative fallback facets each triangle. */
export function createKnotGeometry() {
  const geometry = new TorusKnotGeometry(...knotGeometryArgs)
  geometry.computeTangents()
  const tangent = geometry.getAttribute('tangent')
  const sum = new Vector3
  const other = new Vector3
  const join = (a: number, b: number) => {
    sum.fromBufferAttribute(tangent, a).add(other.fromBufferAttribute(tangent, b)).normalize()
    const handedness = tangent.getW(a)
    tangent.setXYZW(a, sum.x, sum.y, sum.z, handedness)
    tangent.setXYZW(b, sum.x, sum.y, sum.z, handedness)
  }
  const [, , tubular, radial] = knotGeometryArgs
  // UV duplicates must remain separate, but their shading frames must meet seamlessly.
  for (let v = 0; v <= radial; v++) {
    join(v, tubular * (radial + 1) + v)
  }
  for (let u = 0; u <= tubular; u++) {
    join(u * (radial + 1), u * (radial + 1) + radial)
  }
  geometry.computeBoundingBox()
  return geometry
}

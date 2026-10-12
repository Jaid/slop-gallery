import {BufferGeometry, Float32BufferAttribute, Quaternion, Vector3} from 'three/webgpu'

/**
 * An open tube with exactly one ring per polyline vertex. Interior rings lie in the
 * miter plane, so the straight cylinders meet without gaps and follow the same
 * segments as capsule colliders built from the polyline. Unlike a TubeGeometry
 * resampled at a fixed spacing, straight runs need no intermediate rings.
 */
export default class PolylineTubeGeometry extends BufferGeometry {
  readonly parameters: {
    points: ReadonlyArray<Vector3>
    radialSegments: number
    radius: number
  }

  constructor(points: ReadonlyArray<Vector3>, radius: number, radialSegments = 12) {
    super()
    if (points.length < 2 || !Number.isFinite(radius) || radius <= 0 || !Number.isSafeInteger(radialSegments) || radialSegments < 3) {
      throw new RangeError('A polyline tube needs two or more points, a positive radius and at least three radial segments.')
    }
    this.parameters = {
      points,
      radius,
      radialSegments,
    }
    const directions = points.slice(1).map((point, i) => point.clone().sub(points[i]))
    const lengths = directions.map(direction => direction.length())
    if (lengths.some(length => !(length > 1e-9))) {
      throw new RangeError('Consecutive polyline tube points must be distinct.')
    }
    for (const [i, direction] of directions.entries()) {
      direction.divideScalar(lengths[i])
    }
    const total = lengths.reduce((sum, length) => sum + length, 0)
    // Same initial normal choice as Curve.computeFrenetFrames, then parallel transport.
    const first = directions[0]
    const axis = new Vector3
    const smallest = Math.min(Math.abs(first.x), Math.abs(first.y), Math.abs(first.z))
    if (Math.abs(first.x) === smallest) {
      axis.set(1, 0, 0)
    } else if (Math.abs(first.y) === smallest) {
      axis.set(0, 1, 0)
    } else {
      axis.set(0, 0, 1)
    }
    const normal = first.clone().cross(axis).normalize().cross(first).normalize()
    const binormal = first.clone().cross(normal)
    const positions: Array<number> = []
    const normals: Array<number> = []
    const uvs: Array<number> = []
    const indices: Array<number> = []
    const offset = new Vector3
    const miter = new Vector3
    const outgoingNormal = new Vector3
    const vertex = new Vector3
    const rotation = new Quaternion
    let distance = 0
    for (const [i, point] of points.entries()) {
      const incoming = directions[Math.max(0, i - 1)]
      const outgoing = directions[Math.min(directions.length - 1, i)]
      if (i > 0) {
        // Parallel-transport the frame onto the incoming segment so rings never twist.
        rotation.setFromUnitVectors(directions[Math.max(0, i - 2)], incoming)
        normal.applyQuaternion(rotation)
        binormal.applyQuaternion(rotation)
        distance += lengths[i - 1]
      }
      miter.copy(incoming).add(outgoing).normalize()
      const cosine = incoming.dot(miter)
      if (!(cosine > 0.5)) {
        throw new RangeError('Polyline tube joints must turn by less than 120°.')
      }
      for (let j = 0; j <= radialSegments; j++) {
        // TubeGeometry’s angular convention keeps the same outward winding.
        const angle = j / radialSegments * Math.PI * 2
        offset.copy(normal).multiplyScalar(-Math.cos(angle)).addScaledVector(binormal, Math.sin(angle))
        // Slide along the incoming cylinder onto the miter plane, where it meets the outgoing one.
        vertex.copy(offset).multiplyScalar(radius).addScaledVector(incoming, -radius * offset.dot(miter) / cosine)
        outgoingNormal.copy(vertex).addScaledVector(outgoing, -vertex.dot(outgoing)).normalize()
        vertex.add(point)
        positions.push(vertex.x, vertex.y, vertex.z)
        offset.add(outgoingNormal).normalize()
        normals.push(offset.x, offset.y, offset.z)
        uvs.push(distance / total, j / radialSegments)
      }
    }
    for (let i = 1; i < points.length; i++) {
      for (let j = 1; j <= radialSegments; j++) {
        const a = (radialSegments + 1) * (i - 1) + (j - 1)
        const b = (radialSegments + 1) * i + (j - 1)
        const c = (radialSegments + 1) * i + j
        const d = (radialSegments + 1) * (i - 1) + j
        indices.push(a, b, d, b, c, d)
      }
    }
    this.setIndex(indices)
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  }
}

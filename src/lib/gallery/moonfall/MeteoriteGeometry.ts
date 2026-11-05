import {simplex3d} from 'math/noise'
import {mergeVertices, toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js'
import {IcosahedronGeometry, Vector3} from 'three/webgpu'

const noise = simplex3d.create(0x6D_65_74)
const cutNormal = new Vector3(0.95, 0.35, -0.2)

/** where the meteorite was sawn open and polished: the cut’s unit normal and its distance from the middle, as a fraction of the radius */
export const meteoriteCut = {
  normal: cutNormal.normalize(),
  depth: 0.8,
}

/**
 * An iron meteorite of about `radius` round its origin: a lumpy mass, sawn open on one side into a flat face along {@link meteoriteCut}. The thumbprints ablation carved into it on its way down are left to `MeteoriteMaterial`, which keeps the mesh light.
 *
 * `detail` subdivides an icosahedron, so it has 20 × (detail + 1)² triangles.
 */
export default function meteoriteGeometry(radius: number, detail: number) {
  const sphere = new IcosahedronGeometry(1, detail)
  sphere.deleteAttribute('normal')
  sphere.deleteAttribute('uv')
  const geometry = mergeVertices(sphere)
  sphere.dispose()
  const position = geometry.getAttribute('position')
  const point = new Vector3
  const cutDistance = meteoriteCut.depth * radius
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i).normalize()
    // Broad lobes, so it reads as a lump of iron rather than a ball.
    const lobes = fbm(point, 0.9, 3) * 0.16 + fbm(point.clone().multiplyScalar(1.7).addScalar(4), 1, 2) * 0.05
    point.multiplyScalar(radius * (1 + lobes))
    const over = point.dot(meteoriteCut.normal) - cutDistance
    if (over > 0) {
      point.addScaledVector(meteoriteCut.normal, -over)
    }
    position.setXYZ(i, point.x, point.y, point.z)
  }
  // Crisp where the saw cut through, smooth elsewhere.
  const creased = toCreasedNormals(geometry, Math.PI / 5)
  geometry.dispose()
  creased.computeBoundingSphere()
  return creased
}

function fbm(point: Vector3, frequency: number, octaves: number) {
  let sum = 0
  let amplitude = 1
  let scale = frequency
  for (let i = 0; i < octaves; i++) {
    sum += simplex3d.sample(noise, point.x * scale, point.y * scale, point.z * scale) * amplitude
    amplitude *= 0.5
    scale *= 2.03
  }
  return sum
}

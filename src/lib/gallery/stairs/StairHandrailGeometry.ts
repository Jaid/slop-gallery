import type StairTurn from './StairTurn.ts'

import {BufferGeometry, Float32BufferAttribute, Vector3} from 'three/webgpu'

/** One closed rail across two grades and a level bend, with shared vertical join profiles. */
export default class StairHandrailGeometry extends BufferGeometry {
  constructor(turn: StairTurn, side: 'inner' | 'outer', start: readonly [number, number], end: readonly [number, number]) {
    if (![...start, ...end].every(Number.isFinite) || start[0] >= turn.center[0] || end[0] >= turn.center[0]) {
      throw new RangeError('A stair handrail needs finite flight endpoints before the turn plane.')
    }
    super()
    const inner = side === 'inner'
    const radius = inner ? turn.innerRadius + 0.22 : turn.outerRadius - 0.22
    const centerZ = inner ? turn.innerCenterZ : turn.outerCenterZ
    const half = 0.065 / 2
    const segments = Math.ceil(Math.PI * 32)
    const stations = [
      {
        point: new Vector3(start[0], start[1] + 1, centerZ - radius),
        normal: new Vector3(0, 0, 1),
      },
      ...Array.from({length: segments + 1}, (_, i) => {
        const angle = i / segments * Math.PI
        return {
          point: new Vector3(turn.center[0] + Math.sin(angle) * radius, turn.top + 1, centerZ - Math.cos(angle) * radius),
          normal: new Vector3(-Math.sin(angle), 0, Math.cos(angle)),
        }
      }),
      {
        point: new Vector3(end[0], end[1] + 1, centerZ + radius),
        normal: new Vector3(0, 0, -1),
      },
    ]
    const rings = stations.map(({point, normal}) => [
      point.clone().addScaledVector(normal, half).add(new Vector3(0, -half, 0)),
      point.clone().addScaledVector(normal, -half).add(new Vector3(0, -half, 0)),
      point.clone().addScaledVector(normal, -half).add(new Vector3(0, half, 0)),
      point.clone().addScaledVector(normal, half).add(new Vector3(0, half, 0)),
    ])
    const positions: Array<number> = []
    const normals: Array<number> = []
    const uvs: Array<number> = []
    const indices: Array<number> = []
    const quad = (points: Array<Vector3>, faceNormals: Array<Vector3>, from: number, to: number) => {
      const base = positions.length / 3
      for (let i = 0; i < 4; i++) {
        positions.push(...points[i])
        normals.push(...faceNormals[i])
        uvs.push(i < 2 ? from : to, i === 0 || i === 3 ? 0 : half * 2)
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
    let distance = 0
    for (let i = 1; i < rings.length; i++) {
      const from = rings[i - 1]
      const to = rings[i]
      const nextDistance = distance + stations[i].point.distanceTo(stations[i - 1].point)
      for (let face = 0; face < 4; face++) {
        const next = (face + 1) % 4
        const points = [from[face], from[next], to[next], to[face]]
        const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize()
        // Smooth the circular sides, retaining crisp top/bottom edges and grade changes.
        const fromNormal = face % 2 ? stations[i - 1].normal.clone().multiplyScalar(face === 1 ? -1 : 1) : normal
        const toNormal = face % 2 ? stations[i].normal.clone().multiplyScalar(face === 1 ? -1 : 1) : normal
        quad(points, [fromNormal, fromNormal, toNormal, toNormal], distance, nextDistance)
      }
      distance = nextDistance
    }
    // Only the two room ends are capped; there are no internal faces at either landing join.
    const capNormal = new Vector3(-1, 0, 0)
    quad(rings[0].toReversed(), Array.from({length: 4}, () => capNormal), 0, half * 2)
    quad(rings.at(-1)!, Array.from({length: 4}, () => capNormal), 0, half * 2)
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    this.setIndex(indices)
    this.computeBoundingBox()
    this.computeBoundingSphere()
  }
}

import type {Wall} from './walls.ts'
import type {BufferGeometry} from 'three/webgpu'

import {CatmullRomCurve3, ExtrudeGeometry, Line3, Path, Shape, SphereGeometry, TorusGeometry, TubeGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'

export const wallOrnament = {
  halfWidth: 0.8,
  halfHeight: 0.31,
  height: 0.94,
  spacing: 2,
  clearance: 0.2,
}

/** Low corner reliefs move inward only when a doorway occupies the wall end. */
export function wallOrnamentPositions(wall: Wall) {
  const {halfWidth, halfHeight, height, spacing, clearance} = wallOrnament
  const corner = wall.width / 2 - halfWidth - clearance
  const openings = (wall.holes ?? []).filter(hole => height - halfHeight < hole.height + clearance).map(hole => {
    const padding = hole.width / 2 + halfWidth + clearance
    return {
      left: hole.u - padding,
      right: hole.u + padding,
    }
  })
  // Every nearest valid position is either a wall end or a padded doorway edge.
  const candidates = [-corner, corner, ...openings.flatMap(opening => [opening.left, opening.right])].filter(x => x >= -corner && x <= corner && !openings.some(opening => x > opening.left && x < opening.right)).toSorted((a, b) => a - b)
  const left = candidates[0]
  const right = candidates.at(-1)
  if (left === undefined || right === undefined || right - left < spacing) {
    return []
  }
  return [left, right]
}

function stem(path: Path, radius: number, z: number) {
  const points = path.getPoints(16).map(point => new Vector3(point.x, point.y, z))
  const curve = new CatmullRomCurve3(points)
  const line = new Line3(points[0], points.at(-1))
  const closest = new Vector3
  // Most leaf veins are straight despite being authored as quadratic paths.
  const straight = points.every(point => line.closestPointToPoint(point, true, closest).distanceToSquared(point) < 1e-12)
  const segments = straight ? 1 : Math.max(4, Math.ceil(path.getLength() * 48))
  return new TubeGeometry(curve, segments, radius, 6, false).scale(1, 1, 0.65)
}
function leaf(length: number, width: number) {
  const shape = new Shape
  shape.moveTo(0, 0)
  shape.bezierCurveTo(-width * 0.3, length * 0.18, -width, length * 0.36, -width * 0.7, length * 0.57)
  shape.bezierCurveTo(-width * 0.65, length * 0.78, -width * 0.15, length * 0.84, 0, length)
  shape.bezierCurveTo(width * 0.15, length * 0.84, width * 0.65, length * 0.78, width * 0.7, length * 0.57)
  shape.bezierCurveTo(width, length * 0.36, width * 0.3, length * 0.18, 0, 0)
  shape.closePath()
  return new ExtrudeGeometry(shape, {
    depth: 0.006,
    steps: 1,
    curveSegments: 4,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 2,
  }).translate(0, 0, 0.004)
}

/** Shallow carved foliage and gilded scrolls, shared by every wall instance. */
export default class WallOrnamentGeometry {
  readonly brass: BufferGeometry
  readonly foliage: BufferGeometry

  constructor() {
    const foliage: Array<BufferGeometry> = []
    const brass: Array<BufferGeometry> = []
    for (const side of [-1, 1]) {
      const scroll = new Path
      scroll.moveTo(side * 0.08, -0.035)
      scroll.bezierCurveTo(side * 0.24, -0.2, side * 0.44, -0.13, side * 0.58, 0.025)
      scroll.bezierCurveTo(side * 0.79, 0.26, side * 0.83, -0.07, side * 0.66, -0.04)
      scroll.bezierCurveTo(side * 0.58, -0.02, side * 0.64, 0.085, side * 0.685, 0.04)
      brass.push(stem(scroll, 0.008, 0.018))
      for (let i = 0; i < 7; i++) {
        const t = 0.1 + i * 0.072
        const point = scroll.getPoint(t)
        const tangent = scroll.getTangent(t)
        const length = 0.2 - i * 0.009
        for (const direction of [-1, 1]) {
          const angle = Math.atan2(tangent.y, tangent.x * side) + direction * 0.85 - Math.PI / 2
          // Stagger overlapping leaves in depth instead of leaving coplanar caps.
          const relief = i * 0.0004 + (direction === 1 ? 0.0002 : 0)
          foliage.push(leaf(length, 0.044).rotateZ(angle * side).translate(point.x, point.y, relief))
          const vein = new Path
          vein.moveTo(0, 0.015)
          vein.quadraticCurveTo(0, length * 0.45, 0, length * 0.85)
          brass.push(stem(vein, 0.0025, 0.024).rotateZ(angle * side).translate(point.x, point.y, relief))
        }
      }
      // A finer counter-scroll lifts the silhouette above the laurel sprays.
      const tendril = new Path
      tendril.moveTo(side * 0.12, 0)
      tendril.bezierCurveTo(side * 0.24, 0.22, side * 0.43, 0.22, side * 0.4, 0.09)
      tendril.bezierCurveTo(side * 0.38, 0.03, side * 0.31, 0.07, side * 0.34, 0.115)
      brass.push(stem(tendril, 0.005, 0.02))
    }
    for (let petal = 0; petal < 8; petal++) {
      const angle = petal * Math.PI / 4
      foliage.push(leaf(0.12, 0.035).translate(0, 0.025, 0.004).rotateZ(angle))
      const vein = new Path
      vein.moveTo(0, 0.042)
      vein.lineTo(0, 0.12)
      brass.push(stem(vein, 0.003, 0.03).rotateZ(angle))
    }
    brass.push(new TorusGeometry(0.034, 0.005, 6, 24).translate(0, 0, 0.018))
    brass.push(new SphereGeometry(0.025, 12, 8).scale(1, 1, 0.4).translate(0, 0, 0.02))
    // Small pearl finials finish the central flower without a rectangular backing.
    for (const y of [-0.2, 0.2]) {
      brass.push(new SphereGeometry(0.013, 10, 8).scale(1, 1.4, 0.5).translate(0, y, 0.012))
    }
    this.foliage = mergeParts(foliage)
    this.brass = mergeParts(brass)
  }

  dispose() {
    this.foliage.dispose()
    this.brass.dispose()
  }
}

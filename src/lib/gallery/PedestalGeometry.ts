import {mergeGeometries, toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js'
import {BufferGeometry, ExtrudeGeometry, Shape, Vector2} from 'three/webgpu'

import {colliderGeometry} from './architecture.ts'

function footprint(width: number, fluted = false) {
  const shape = new Shape
  const half = width / 2
  const corner = 0.025
  // Exact quarter-turns keep collinear cap vertices collinear during triangulation.
  const point = (x: number, y: number, side: number) => side === 0 ? new Vector2(x, y) : side === 1 ? new Vector2(-y, x) : side === 2 ? new Vector2(-x, -y) : new Vector2(y, -x)
  shape.moveTo(-half + corner, -half)
  for (let side = 0; side < 4; side++) {
    if (fluted) {
      // Eight concave channels per face, with solid corner stiles between faces.
      for (let flute = 0; flute < 8; flute++) {
        const center = (flute - 3.5) * 0.094
        const start = point(center - 0.032, -half, side)
        shape.lineTo(start.x, start.y)
        for (let step = 1; step <= 16; step++) {
          const angle = step / 16 * Math.PI
          const p = point(center - Math.cos(angle) * 0.032, -half + Math.sin(angle) * 0.022, side)
          shape.lineTo(p.x, p.y)
        }
      }
    }
    const end = point(half - corner, -half, side)
    const next = point(half, -half + corner, side)
    shape.lineTo(end.x, end.y)
    shape.lineTo(next.x, next.y)
  }
  shape.closePath()
  return shape
}

function block(width: number, bottom: number, top: number, bevel: number, fluted = false) {
  // Negative bevel offset keeps the finished silhouette inside the requested width.
  const geometry = new ExtrudeGeometry(footprint(width, fluted), {
    depth: top - bottom - bevel * 2,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 2,
  }).rotateX(-Math.PI / 2).translate(0, bottom + bevel, 0)
  // The normal utility welds positions at 0.01 units; use centimeters so it does
  // not merge neighboring samples in these small channels and edge bevels.
  return fluted ? toCreasedNormals(geometry.scale(100, 100, 100), Math.PI / 6).scale(0.01, 0.01, 0.01) : geometry
}

function merge(parts: Array<BufferGeometry>) {
  try {
    const geometry = mergeGeometries(parts)!
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    return geometry
  } finally {
    for (const part of parts) part.dispose()
  }
}

/** A fluted stone plinth with a stepped foot, recessed collars and a beveled cap. */
export class PedestalGeometry {
  // Preserve the original 1.16 m footprint and 1.35 m sculpture support height.
  readonly stone = merge([
    block(1.16, 0, 0.105, 0.012),
    block(1.09, 0.105, 0.185, 0.018),
    block(1.01, 0.185, 0.23, 0.007),
    block(0.96, 0.25, 1.12, 0.005, true),
    block(1.01, 1.14, 1.19, 0.007),
    block(1.085, 1.19, 1.255, 0.014),
    block(1.16, 1.255, 1.35, 0.012),
  ])
  readonly bronze = merge([
    block(0.974, 0.232, 0.242, 0.002),
    block(0.974, 1.128, 1.138, 0.002),
  ])
  readonly reveals = merge([
    block(0.94, 0.23, 0.25, 0.002),
    block(0.94, 1.12, 1.14, 0.002),
  ])
  // Fixed concave colliders follow the actual flutes, ledges and beveled edges.
  readonly collision = [this.stone, this.bronze, this.reveals].map(colliderGeometry)

  dispose() {
    this.stone.dispose()
    this.bronze.dispose()
    this.reveals.dispose()
  }
}

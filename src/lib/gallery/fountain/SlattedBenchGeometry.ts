import type {BufferGeometry} from 'three/webgpu'

import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {CylinderGeometry, Vector3} from 'three/webgpu'

import {circleSegments, mergeParts} from '../../geometry.ts'
import PolylineTubeGeometry from '../railings/PolylineTubeGeometry.ts'
import {fountainBench} from './benches.ts'

const tubeRadius = 0.022
const footInset = 0.04
const legInset = 0.18
const railInset = 0.055
const bend = 0.055
const bendSegments = 10
/** Fillets a closed polyline in the yz plane and repeats its first point to close the loop. */
function fillet(x: number, polygon: Array<[number, number]>, radius: number, count: number) {
  const size = polygon.length
  const point = (index: number) => new Vector3(x, polygon[(index + size) % size][0], polygon[(index + size) % size][1])
  const axis = new Vector3(1, 0, 0)
  const points: Array<Vector3> = []
  for (let i = 0; i < size; i++) {
    const previous = point(i - 1)
    const corner = point(i)
    const next = point(i + 1)
    const incoming = previous.clone().sub(corner).normalize()
    const outgoing = next.clone().sub(corner).normalize()
    const half = Math.acos(Math.min(1, incoming.dot(outgoing))) / 2
    const offset = radius / Math.tan(half)
    const start = corner.clone().addScaledVector(incoming, offset)
    const end = corner.clone().addScaledVector(outgoing, offset)
    const center = corner.clone().addScaledVector(incoming.clone().add(outgoing).normalize(), radius / Math.sin(half))
    points.push(start)
    const from = start.clone().sub(center)
    const to = end.clone().sub(center)
    const angle = Math.atan2(from.y * to.z - from.z * to.y, from.dot(to))
    const sagitta = radius * (1 - Math.cos(Math.abs(angle) / count / 2))
    // The uprights lean, so these corners sweep more than a right angle.
    if (Math.abs(start.distanceTo(center) - radius) > 1e-6 || Math.abs(end.distanceTo(center) - radius) > 1e-6 || sagitta > 0.0005) {
      throw new RangeError('A bench bend left its arc.')
    }
    for (let step = 1; step < count; step++) {
      points.push(from.clone().applyAxisAngle(axis, angle * step / count).add(center))
    }
  }
  points.push(points[0])
  return points
}
/** One sled: a floor runner, two uprights and the return under the battens, with every corner rounded. */
function sled(x: number, top: number, depth: number) {
  const legZ = depth / 2 - legInset
  const footTarget = depth / 2 - footInset
  let low = legZ
  let high = depth
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2
    const reached = Math.max(...fillet(0, [
      [tubeRadius, -mid],
      [top, -legZ],
      [top, legZ],
      [tubeRadius, mid],
    ], bend, bendSegments).map(point => Math.abs(point.z))) + tubeRadius
    if (reached < footTarget) {
      low = mid
    } else {
      high = mid
    }
  }
  const points = fillet(x, [
    [tubeRadius, -low],
    [top, -legZ],
    [top, legZ],
    [tubeRadius, low],
  ], bend, bendSegments)
  return new PolylineTubeGeometry(points, tubeRadius, circleSegments(tubeRadius))
}

/**
 * Lengthwise teak battens on two continuous brushed-steel sled frames, shared by both benches.
 *
 * Each frame is one bent tube: a floor runner, rounded feet and uprights, then a short return under the battens. Straight runs shade evenly under the local-space satin shader, which the old flat box legs did not.
 */
export default class SlattedBenchGeometry {
  readonly metal: BufferGeometry
  readonly wood: BufferGeometry

  constructor() {
    const {width, depth, height, slats, slatGap} = fountainBench
    const pitch = (depth + slatGap) / slats
    const wood: Array<BufferGeometry> = []
    const metal: Array<BufferGeometry> = []
    for (let i = 0; i < slats; i++) {
      const z = (i + 0.5) * pitch - (depth + slatGap) / 2
      // Two smooth-shaded facets per 12 mm round-over stay within 1 mm of the true arc.
      const slat = new RoundedBoxGeometry(width, 0.085, pitch - slatGap, 1, 0.012)
      // Rotate the grain too, along the seat and the long edges of each batten.
      const uv = slat.getAttribute('uv')
      for (let vertex = 0; vertex < uv.count; vertex++) {
        uv.setXY(vertex, uv.getY(vertex), uv.getX(vertex))
      }
      wood.push(slat.translate(0, height - 0.0425, z))
      for (const side of [-1, 1]) {
        const screwHead = new CylinderGeometry(0.01, 0.01, 0.003, 8)
        metal.push(screwHead.translate(side * (width / 2 - railInset - 0.09), height + 0.001, z))
      }
    }
    const top = height - 0.1
    for (const side of [-1, 1]) {
      metal.push(sled(side * (width / 2 - railInset), top, depth))
    }
    this.wood = mergeParts(wood)
    this.metal = mergeParts(metal)
  }

  dispose() {
    this.wood.dispose()
    this.metal.dispose()
  }
}

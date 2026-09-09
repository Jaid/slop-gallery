import type {Vec3} from '../types.ts'

import {Curve, Quaternion, Vector3} from 'three/webgpu'

export type RailingAnchor = {ground: Vec3
  height: number}

type RailingPost = {height: number
  position: Vec3}
type RailingSegment = {halfLength: number
  position: Vec3
  rotation: [number, number, number, number]}

export class RailingPath extends Curve<Vector3> {
  readonly distances = [0]
  readonly length: number
  readonly postRadius = 0.035
  readonly posts: Array<RailingPost>
  readonly radius = 0.04
  readonly segments: Array<RailingSegment>

  constructor(readonly anchors: Array<RailingAnchor>) {
    super()
    if (anchors.length < 2 || anchors.some(anchor => !anchor.ground.every(Number.isFinite) || !Number.isFinite(anchor.height) || anchor.height <= 0)) {
      throw new RangeError('A railing needs at least two finite anchors with positive heights.')
    }
    for (let i = 1; i < anchors.length; i++) {
      const distance = this.top(i).distanceTo(this.top(i - 1))
      if (distance < 0.000_001) {
        throw new RangeError('Consecutive railing anchors must be distinct.')
      }
      this.distances.push(this.distances[i - 1]! + distance)
    }
    this.length = this.distances.at(-1)!
    this.segments = anchors.slice(1).map((_, i) => {
      const a = this.top(i)
      const b = this.top(i + 1)
      const direction = b.clone().sub(a)
      const rotation = (new Quaternion).setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize())
      return {
        position: a.add(b).multiplyScalar(0.5).toArray(),
        rotation: rotation.toArray(),
        halfLength: direction.length() / 2,
      }
    })
    const count = Math.ceil(this.length / 1.4)
    this.posts = Array.from({length: count + 1}, (_, i) => {
      const anchor = this.sample(i / count)
      return {
        position: [anchor.ground[0], anchor.ground[1] + anchor.height / 2, anchor.ground[2]],
        height: anchor.height,
      }
    })
  }

  getPoint(t: number, target = new Vector3) {
    const {ground, height} = this.sample(t)
    return target.set(ground[0], ground[1] + height, ground[2])
  }

  sample(t: number): RailingAnchor {
    const distance = Math.max(0, Math.min(1, t)) * this.length
    let low = 0
    let high = this.distances.length - 1
    while (low + 1 < high) {
      const mid = low + high >>> 1
      if (this.distances[mid]! <= distance) {
        low = mid
      } else {
        high = mid
      }
    }
    const a = this.anchors[low]!
    const b = this.anchors[high]!
    const f = (distance - this.distances[low]!) / (this.distances[high]! - this.distances[low]!)
    return {
      ground: a.ground.map((value, i) => value + (b.ground[i]! - value) * f) as Vec3,
      height: a.height + (b.height - a.height) * f,
    }
  }

  private top(index: number) {
    const {ground, height} = this.anchors[index]!
    return new Vector3(ground[0], ground[1] + height, ground[2])
  }
}

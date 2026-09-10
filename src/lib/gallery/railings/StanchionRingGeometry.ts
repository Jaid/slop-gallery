import type {BufferGeometry} from 'three/webgpu'

import {LatheGeometry, SphereGeometry, TubeGeometry, Vector2} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {RopeRing} from './RopeRing.ts'

/** A closed museum barrier with weighted posts, softly sagging ropes and mesh-accurate collision. */
export class StanchionRingGeometry {
  readonly posts: BufferGeometry
  readonly rope: BufferGeometry

  constructor(readonly radius: number, readonly count: number) {
    if (!Number.isFinite(radius) || radius <= 0 || !Number.isSafeInteger(count) || count < 3) {
      throw new RangeError('A stanchion ring needs a positive radius and at least three posts.')
    }
    const metal: Array<BufferGeometry> = []
    const profile = [[0, 0], [0.17, 0], [0.18, 0.025], [0.16, 0.055], [0.065, 0.09], [0.034, 0.16], [0.034, 0.95], [0.052, 0.99], [0.052, 1.025], [0, 1.025]].map(([x, y]) => new Vector2(x, y))
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2
      const x = radius * Math.cos(angle)
      const z = radius * Math.sin(angle)
      metal.push(new LatheGeometry(profile, 16).translate(x, 0, z), new SphereGeometry(0.075, 12, 8).translate(x, 1.045, z))
    }
    this.posts = mergeParts(metal)
    this.rope = new TubeGeometry(new RopeRing(radius, count), count * 16, 0.028, 8, true)
  }

  dispose() {
    this.posts.dispose()
    this.rope.dispose()
  }
}


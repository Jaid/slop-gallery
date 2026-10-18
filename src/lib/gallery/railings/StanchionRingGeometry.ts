import type {ProfilePoint} from '../RevolvedProfileGeometry.ts'
import type {BufferGeometry} from 'three/webgpu'

import {LatheGeometry, SphereGeometry, TubeGeometry, Vector2} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import RevolvedProfileGeometry from '../RevolvedProfileGeometry.ts'
import RopeRing from './RopeRing.ts'

const finial = {
  radius: 0.075,
  y: 1.045,
}
const shaftRadius = 0.032
const flare = {
  top: 0.2,
  bottom: 0.045,
  radius: 0.158,
}
/**
 * Turned post profile from the top of the collar under the finial down to the floor: a beaded collar, a slim shaft, a trumpet flare and a weighted base with a rounded rim.
 *
 * Polished metal mirrors every kink of its silhouette, so the flare is a smooth curve instead of a few straight cones.
 */
export const stanchionProfile: ReadonlyArray<ProfilePoint> = [
  [0, 1.005],
  [0.046, 1.005],
  [0.054, 0.996],
  [0.056, 0.985],
  [0.052, 0.974],
  [0.042, 0.966],
  [shaftRadius + 0.004, 0.956],
  [shaftRadius, 0.944],
  ...Array.from({length: 11}, (_, i): ProfilePoint => {
    const t = i / 10
    return [shaftRadius + (flare.radius - shaftRadius) * t ** 2.4, flare.top + (flare.bottom - flare.top) * t]
  }),
  [0.168, 0.041],
  [0.175, 0.033],
  [0.178, 0.022],
  [0.176, 0.01],
  [0.17, 0.002],
  [0.164, 0],
  [0, 0],
]
// The old, coarse profile: close enough to the turned post for the player and thrown objects, at a fraction of the triangles.
const collisionProfile = [[0, 0], [0.17, 0], [0.18, 0.025], [0.16, 0.055], [0.065, 0.09], [0.034, 0.16], [0.034, 0.95], [0.052, 0.99], [0.052, 1.025], [0, 1.025]].map(([x, y]) => new Vector2(x, y))

/** A closed museum barrier with turned, weighted posts, softly sagging ropes and lighter collision stand-ins for the posts. */
export default class StanchionRingGeometry {
  /** coarse posts for collision */
  readonly postCollision: BufferGeometry
  /** turned posts with their ball finials, finely tessellated for polished metal */
  readonly posts: BufferGeometry
  readonly rope: BufferGeometry

  constructor(readonly radius: number, readonly count: number) {
    if (!Number.isFinite(radius) || radius <= 0 || !Number.isSafeInteger(count) || count < 3) {
      throw new RangeError('A stanchion ring needs a positive radius and at least three posts.')
    }
    const metal: Array<BufferGeometry> = []
    const collision: Array<BufferGeometry> = []
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2
      const x = radius * Math.cos(angle)
      const z = radius * Math.sin(angle)
      const post = new RevolvedProfileGeometry(stanchionProfile, {sides: 24})
      const ball = new SphereGeometry(finial.radius, 24, 16)
      metal.push(post.translate(x, 0, z), ball.translate(x, finial.y, z))
      const collisionPost = new LatheGeometry(collisionProfile, 12)
      const collisionBall = new SphereGeometry(finial.radius, 12, 8)
      collision.push(collisionPost.translate(x, 0, z), collisionBall.translate(x, finial.y, z))
    }
    this.posts = mergeParts(metal)
    this.postCollision = mergeParts(collision)
    this.rope = new TubeGeometry(new RopeRing(radius, count), count * 16, 0.028, 12, true)
  }

  dispose() {
    this.posts.dispose()
    this.postCollision.dispose()
    this.rope.dispose()
  }
}

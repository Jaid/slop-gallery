import type {Vec3} from '../types.ts'
import type PassageTransition from './PassageTransition.ts'
import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, Matrix4, Vector2} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {wallFace} from '../architectureDimensions.ts'
import grainUvs from './grainUvs.ts'
import {transitionFrameDepth, transitionMouthProjection} from './PassageTransition.ts'
import SaddleGeometry from './SaddleGeometry.ts'
import {timberRing} from './TimberGeometry.ts'

const archSegments = 32
/** Timber portals and skirting stand 1 cm proud of the stone baseboard cap (0.25 m), which would otherwise show through. */
export const transitionClearance = 0.26
/** Hidden overlap into the wall and vault, which hides the gaps between their differently tessellated arches. */
const embed = 0.03
/** Overlap into the portals, so boards end inside them instead of on coplanar faces. */
const tuck = 0.01
const skirtingHeight = 0.5
const boardRecess = 0.14
/** Polyline up one side, over a semicircular arch springing at `spring` and down the other side. */
function archProfile(radius: number, spring: number, bottom: number) {
  const points = [new Vector2(-radius, bottom)]
  for (let i = 0; i <= archSegments; i++) {
    const angle = Math.PI * (1 - i / archSegments)
    points.push(new Vector2(Math.cos(angle) * radius, spring + Math.sin(angle) * radius))
  }
  points.push(new Vector2(radius, bottom))
  return points
}

/**
 * Timber portals, skirting and boarding for a {@link PassageTransition}, in world space.
 *
 * Profiles are measured from the passage axis: the stone wall face sits `wallFace` inside the passage half width,
 * and the barrel vault springs where the walls end.
 */
export default class TransitionGeometry {
  /** Cedar boards lining the walls and vault between the portals. */
  readonly lining: BufferGeometry
  /** The floor planks between the sill and the passage mouth. Walkable collision stays with the passage floor. */
  readonly planks: BufferGeometry
  /** The saddle under the first portal, standing a few centimeters proud of the floor on both sides. */
  readonly sill: BufferGeometry
  /** Portals and skirting. */
  readonly timber: BufferGeometry

  constructor(transition: PassageTransition) {
    const {passage, frames, spanLength} = transition
    const {start, end} = passage.spans.at(-1)!
    const transform = new Matrix4
    transform.makeRotationY(Math.atan2(end[0] - start[0], end[1] - start[1]))
    transform.setPosition(start[0], passage.floorY, start[1])
    const half = passage.width / 2
    const spring = passage.height - half
    const inner = half - transitionClearance
    const outer = half + embed
    const boardFace = half - boardRecess
    if (spring <= skirtingHeight || boardFace >= half - wallFace) {
      throw new RangeError('A passage transition needs its vault to spring above the skirting and its boards in front of the stone wall.')
    }
    // Boxes in passage space: x across, y up from the floor, z along the final span. Grain runs along `grain`.
    const box = (min: Vec3, max: Vec3, grain: 0 | 1 | 2) => {
      const size = max.map((value, i) => value - min[i]) as Vec3
      const geometry = new BoxGeometry(...size)
      geometry.translate(...max.map((value, i) => (value + min[i]) / 2) as Vec3)
      return grainUvs(geometry, grain).applyMatrix4(transform)
    }
    const sides = [-1, 1] as const
    // A board band on both walls between two distances, optionally continuing over the vault.
    const walls = (from: number, to: number, bottom: number, top: number, face: number, back: number, grain: 0 | 1 | 2) => sides.map(side => {
      const near = side * face
      const far = side * back
      return box([Math.min(near, far), bottom, from], [Math.max(near, far), top, to], grain)
    })
    const timber: Array<BufferGeometry> = []
    const lining: Array<BufferGeometry> = []
    for (const [i, distance] of frames.entries()) {
      const depth = transitionFrameDepth + (i === frames.length - 1 ? transitionMouthProjection : 0)
      timber.push(...timberRing(archProfile(inner, spring, 0), archProfile(outer, spring, 0), depth, distance, transform))
    }
    // A wooden skirting covers the stone baseboard. It is flush with the portals, so it butts against them instead of overlapping.
    timber.push(...walls(frames[0] + transitionFrameDepth, frames[1], 0, skirtingHeight, inner, half - wallFace + 0.005, 2))
    // Between the portals, boards line the walls and the vault.
    const boardedTo = frames[1] + tuck
    const boardedStart = frames[0] + transitionFrameDepth - tuck
    lining.push(...timberRing(archProfile(boardFace, spring, skirtingHeight), archProfile(outer, spring, skirtingHeight), boardedTo - boardedStart, boardedStart, transform))
    this.timber = mergeParts(timber)
    this.lining = mergeParts(lining)
    // Across the full width, so its ends disappear into the portal’s posts.
    const saddle = new SaddleGeometry(passage.width, transitionFrameDepth)
    this.sill = saddle.translate(0, 0, frames[0] + transitionFrameDepth / 2).applyMatrix4(transform)
    this.planks = box([-half, -0.24, frames[0] + transitionFrameDepth], [half, 0, spanLength], 2)
    for (const geometry of [this.sill, this.planks]) {
      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()
    }
  }

  dispose() {
    this.timber.dispose()
    this.lining.dispose()
    this.sill.dispose()
    this.planks.dispose()
  }
}

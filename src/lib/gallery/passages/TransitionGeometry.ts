import type {Vec3} from '../types.ts'
import type PassageTransition from './PassageTransition.ts'
import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, Matrix4, Vector2} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {wallFace} from '../architectureDimensions.ts'
import {transitionFrameDepth, transitionMouthProjection} from './PassageTransition.ts'
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
const rail = {
  bottom: -0.04,
  height: 0.12,
  depth: 0.21,
}
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
 * Timber portals, skirting, rails and boarding for a {@link PassageTransition}, in world space.
 *
 * Profiles are measured from the passage axis: the stone wall face sits `wallFace` inside the passage half width,
 * and the barrel vault springs where the walls end.
 */
export default class TransitionGeometry {
  /** Cedar boards: a wainscot under the stone vault, then a fully boarded vault. */
  readonly lining: BufferGeometry
  /** The floor planks between the sill and the passage mouth. Walkable collision stays with the passage floor. */
  readonly planks: BufferGeometry
  /** The flush sill under the middle portal. */
  readonly sill: BufferGeometry
  /** Portals, skirting and wainscot rails. */
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
    if (spring <= rail.bottom + rail.height || boardFace >= half - wallFace) {
      throw new RangeError('A passage transition needs its vault to spring above the wainscot rail.')
    }
    // Boxes in passage space: x across, y up from the floor, z along the final span. Grain runs along `grain`.
    const box = (min: Vec3, max: Vec3, grain: 0 | 1 | 2) => {
      const size = max.map((value, i) => value - min[i]) as Vec3
      const geometry = new BoxGeometry(...size)
      geometry.translate(...max.map((value, i) => (value + min[i]) / 2) as Vec3)
      const position = geometry.getAttribute('position')
      const normal = geometry.getAttribute('normal')
      const uv = geometry.getAttribute('uv')
      for (let vertex = 0; vertex < position.count; vertex++) {
        const coordinates = [position.getX(vertex), position.getY(vertex), position.getZ(vertex)]
        const facing = [normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)].map(Math.abs)
        const axis = facing.indexOf(Math.max(...facing))
        const inFace = [0, 1, 2].filter(i => i !== axis)
        const along = inFace.includes(grain) ? grain : inFace[0]
        const across = inFace.find(i => i !== along)!
        uv.setXY(vertex, coordinates[across] * 0.7, coordinates[along] * 0.7)
      }
      return geometry.applyMatrix4(transform)
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
    const bays = [[frames[0], frames[1]], [frames[1], frames[2]]] as const
    for (const [from, to] of bays) {
      // A wooden skirting covers the stone baseboard. It is flush with the portals, so it butts against them instead of overlapping.
      timber.push(...walls(from + transitionFrameDepth, to, 0, skirtingHeight, inner, half - wallFace + 0.005, 2))
    }
    // Wainscot under the stone vault, capped by a rail at the springing line.
    const [wainscotFrom, wainscotTo] = [bays[0][0] + transitionFrameDepth - tuck, bays[0][1] + tuck]
    lining.push(...walls(wainscotFrom, wainscotTo, skirtingHeight, spring, boardFace, outer, 1))
    timber.push(...walls(wainscotFrom, wainscotTo, spring + rail.bottom, spring + rail.bottom + rail.height, half - rail.depth, outer, 2))
    // Beyond the middle portal, the boards continue over the vault.
    const boardedTo = frames[2] + tuck
    const boardedStart = frames[1] + transitionFrameDepth - tuck
    lining.push(...timberRing(archProfile(boardFace, spring, skirtingHeight), archProfile(outer, spring, skirtingHeight), boardedTo - boardedStart, boardedStart, transform))
    this.timber = mergeParts(timber)
    this.lining = mergeParts(lining)
    // The paving runs through the wainscoted bay; timber flooring starts under the middle portal.
    this.sill = box([-half, -0.24, frames[1]], [half, 0, frames[1] + transitionFrameDepth], 0)
    this.planks = box([-half, -0.24, frames[1] + transitionFrameDepth], [half, 0, spanLength], 2)
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

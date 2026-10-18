import type Passage from './Passage.ts'
import type {BufferGeometry} from 'three/webgpu'

import {ExtrudeGeometry, Shape} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'

/** how far a barrel vault reaches into an elbow, burying the ends of the walls’ cornices that stop where it would otherwise end */
const junctionOverlap = 0.01
const ribDepth = 0.22

/** Barrel vaults stop short of elbows, where the continuous roof closes the turn. */
export default class VaultGeometry {
  readonly ribs: BufferGeometry
  readonly shell: BufferGeometry

  /** `ribFreeEnd` keeps the final meters free of stone ribs, e.g. for a timber transition. */
  constructor(passage: Passage, ribFreeEnd = 0) {
    if (!Number.isFinite(ribFreeEnd) || ribFreeEnd < 0) {
      throw new RangeError('The rib-free end of a vault needs a finite, nonnegative length.')
    }
    const shells: Array<BufferGeometry> = []
    const ribs: Array<BufferGeometry> = []
    const radius = passage.width / 2
    const spring = passage.height - radius
    for (const [i, {start, end}] of passage.spans.entries()) {
      const dx = end[0] - start[0]
      const dz = end[1] - start[1]
      const length = Math.hypot(dx, dz)
      const from = i > 0 ? radius : 0
      const to = length - (i < passage.spans.length - 1 ? radius : 0)
      if (to <= from) {
        continue
      }
      const shellFrom = from - (i > 0 ? junctionOverlap : 0)
      const shellTo = to + (i < passage.spans.length - 1 ? junctionOverlap : 0)
      const rotation = Math.atan2(dx, dz)
      const part = (r: number, depth: number, thickness: number, distance: number) => {
        const shape = new Shape
        shape.moveTo(-r, spring)
        shape.absarc(0, spring, r, Math.PI, 0, true)
        shape.lineTo(r + thickness, spring)
        shape.absarc(0, spring, r + thickness, 0, Math.PI, false)
        shape.closePath()
        const archBand = new ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: false,
          curveSegments: 32,
        })
        return archBand
          .translate(0, 0, -depth / 2)
          .rotateY(rotation)
          .translate(start[0] + dx / length * distance, passage.floorY, start[1] + dz / length * distance)
      }
      shells.push(part(radius, shellTo - shellFrom, 0.22, (shellTo + shellFrom) / 2))
      const ribTo = to - (i === passage.spans.length - 1 ? ribFreeEnd : 0)
      if (ribTo - from < 0.3) {
        continue
      }
      const span = ribTo - from - 0.3
      // On a short run, the ribs at both ends would overlap and share their faces; a single rib in the middle takes their place.
      if (span < ribDepth) {
        ribs.push(part(radius - 0.085, ribDepth, 0.085, (from + ribTo) / 2))
        continue
      }
      const count = Math.max(1, Math.ceil((ribTo - from) / 3.2))
      for (let rib = 0; rib <= count; rib++) {
        const distance = from + 0.15 + span * rib / count
        ribs.push(part(radius - 0.085, ribDepth, 0.085, distance))
      }
    }
    this.shell = mergeParts(shells)
    this.ribs = mergeParts(ribs)
  }

  dispose() {
    this.shell.dispose()
    this.ribs.dispose()
  }
}

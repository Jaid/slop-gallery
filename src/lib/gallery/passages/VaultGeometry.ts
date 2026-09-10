import type {Passage} from './Passage.ts'
import type {BufferGeometry} from 'three/webgpu'

import {ExtrudeGeometry, Shape} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'

/** Barrel vaults stop short of elbows, where the continuous roof closes the turn. */
export class VaultGeometry {
  readonly ribs: BufferGeometry
  readonly shell: BufferGeometry

  constructor(passage: Passage) {
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
      const rotation = Math.atan2(dx, dz)
      const part = (r: number, depth: number, thickness: number, distance: number) => {
        const shape = new Shape
        shape.moveTo(-r, spring)
        shape.absarc(0, spring, r, Math.PI, 0, true)
        shape.lineTo(r + thickness, spring)
        shape.absarc(0, spring, r + thickness, 0, Math.PI, false)
        shape.closePath()
        return new ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: false,
          curveSegments: 32,
        })
          .translate(0, 0, -depth / 2)
          .rotateY(rotation)
          .translate(start[0] + dx / length * distance, passage.floorY, start[1] + dz / length * distance)
      }
      shells.push(part(radius, to - from, 0.22, (to + from) / 2))
      const count = Math.max(1, Math.ceil((to - from) / 3.2))
      for (let rib = 0; rib <= count; rib++) {
        const distance = from + 0.15 + (to - from - 0.3) * rib / count
        ribs.push(part(radius - 0.085, 0.22, 0.085, distance))
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

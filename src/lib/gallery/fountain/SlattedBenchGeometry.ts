import type {BufferGeometry} from 'three/webgpu'

import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {BoxGeometry, CylinderGeometry} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {fountainBench} from './benches.ts'

/** Lengthwise teak battens on two brushed-metal U-frames, shared by all four benches. */
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
      const slat = new RoundedBoxGeometry(width, 0.085, pitch - slatGap, 2, 0.012)
      // Rotate the grain too, along the seat and the long edges of each batten.
      const uv = slat.getAttribute('uv')
      for (let vertex = 0; vertex < uv.count; vertex++) {
        uv.setXY(vertex, uv.getY(vertex), uv.getX(vertex))
      }
      wood.push(slat.translate(0, height - 0.0425, z))
      for (const x of [-1.04, 1.04]) {
        metal.push(new CylinderGeometry(0.01, 0.01, 0.003, 8).translate(x, height + 0.001, z))
      }
    }
    for (const x of [-1.04, 1.04]) {
      metal.push(new BoxGeometry(0.085, 0.065, depth - 0.06).translate(x, height - 0.1, 0))
      for (const side of [-1, 1]) {
        metal.push(new BoxGeometry(0.085, height - 0.1, 0.05).translate(x, (height - 0.1) / 2, side * (depth / 2 - 0.075)))
      }
    }
    this.wood = mergeParts(wood)
    this.metal = mergeParts(metal)
  }

  dispose() {
    this.wood.dispose()
    this.metal.dispose()
  }
}

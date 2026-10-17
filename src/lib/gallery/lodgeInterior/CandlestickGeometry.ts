import type {BufferGeometry} from 'three/webgpu'

import {CylinderGeometry, SphereGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {place, rod} from './place.ts'

/**
 * A turned iron candlestick for the mantel, merged per material.
 *
 * `iron` is the candlestick, `wax` and `flame` its candle, all with their origin under the base.
 */
export default class CandlestickGeometry {
  readonly flame: BufferGeometry
  readonly iron: BufferGeometry
  readonly wax: BufferGeometry

  constructor() {
    this.iron = mergeParts([
      place(new CylinderGeometry(0.045, 0.06, 0.02, 20), 0, 0.01, 0),
      place(new SphereGeometry(0.025, 12, 8), 0, 0.04, 0),
      rod(new Vector3(0, 0.02, 0), new Vector3(0, 0.19, 0), 0.011, 10),
      place(new SphereGeometry(0.02, 12, 8), 0, 0.13, 0),
      place(new CylinderGeometry(0.035, 0.018, 0.03, 16), 0, 0.2, 0),
    ])
    this.wax = place(new CylinderGeometry(0.02, 0.021, 0.17, 14), 0, 0.3, 0)
    const flame = new SphereGeometry(0.014, 8, 6)
    this.flame = place(flame.scale(1, 2.4, 1), 0, 0.415, 0)
  }

  dispose() {
    this.iron.dispose()
    this.wax.dispose()
    this.flame.dispose()
  }
}

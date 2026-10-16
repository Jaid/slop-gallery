import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {place, rod} from './place.ts'

/**
 * Forged hearth accessories, merged per material.
 *
 * `fireTools` is a stand with a poker, a shovel and a brush, its origin on the floor under the stand. `candlestick` is one turned iron candlestick, `candleWax` and `candleFlame` its candle, all with their origin under the base.
 */
export default class HearthAccessoriesGeometry {
  readonly candleFlame: BufferGeometry
  readonly candlestick: BufferGeometry
  readonly candleWax: BufferGeometry
  readonly fireTools: BufferGeometry

  constructor() {
    const tools: Array<BufferGeometry> = [
      place(new CylinderGeometry(0.12, 0.14, 0.025, 20), 0, 0.0125, 0),
      rod(new Vector3(0, 0.02, 0), new Vector3(0, 0.78, 0), 0.012, 8),
      place(new TorusGeometry(0.045, 0.009, 6, 16), 0, 0.83, 0),
      rod(new Vector3(-0.13, 0.7, 0), new Vector3(0.13, 0.7, 0), 0.008),
    ]
    for (const [index, x] of [-0.1, 0, 0.1].entries()) {
      // Each tool hangs from the crossbar by its ring handle.
      tools.push(place(new TorusGeometry(0.02, 0.005, 5, 12), x, 0.68, 0), rod(new Vector3(x, 0.66, 0), new Vector3(x, 0.1, 0), 0.007))
      if (index === 0) {
        tools.push(rod(new Vector3(x, 0.1, 0), new Vector3(x + 0.035, 0.06, 0), 0.007))
      } else if (index === 1) {
        const blade = new BoxGeometry(0.1, 0.12, 0.008)
        tools.push(place(blade.rotateX(0.25), x, 0.07, 0.012))
      } else {
        tools.push(place(new CylinderGeometry(0.035, 0.028, 0.09, 12), x, 0.06, 0))
      }
    }
    this.fireTools = mergeParts(tools)
    this.candlestick = mergeParts([
      place(new CylinderGeometry(0.045, 0.06, 0.02, 20), 0, 0.01, 0),
      place(new SphereGeometry(0.025, 12, 8), 0, 0.04, 0),
      rod(new Vector3(0, 0.02, 0), new Vector3(0, 0.19, 0), 0.011, 10),
      place(new SphereGeometry(0.02, 12, 8), 0, 0.13, 0),
      place(new CylinderGeometry(0.035, 0.018, 0.03, 16), 0, 0.2, 0),
    ])
    this.candleWax = place(new CylinderGeometry(0.02, 0.021, 0.17, 14), 0, 0.3, 0)
    const flame = new SphereGeometry(0.014, 8, 6)
    this.candleFlame = place(flame.scale(1, 2.4, 1), 0, 0.415, 0)
  }

  dispose() {
    this.fireTools.dispose()
    this.candlestick.dispose()
    this.candleWax.dispose()
    this.candleFlame.dispose()
  }
}

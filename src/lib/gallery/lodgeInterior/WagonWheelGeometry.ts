import type {BufferGeometry} from 'three/webgpu'

import {CylinderGeometry, SphereGeometry, TorusGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {place, rod} from './place.ts'

/**
 * A forged wagon-wheel chandelier: a rim, eight spokes and a hub, three chains gathering to a rod and a ceiling canopy, with a candle in a cup over every spoke.
 *
 * The origin is at the hub. `iron`, `wax` and `flames` are merged per material.
 */
export default class WagonWheelGeometry {
  static readonly candles = 8
  static readonly radius = 0.78
  readonly flames: BufferGeometry
  readonly iron: BufferGeometry
  readonly wax: BufferGeometry

  /** @param drop distance from the hub up to the ceiling */
  constructor(drop: number) {
    if (!(drop > 0.5)) {
      throw new RangeError('A wagon wheel needs more than 50 cm below the ceiling.')
    }
    const {radius, candles} = WagonWheelGeometry
    const rim = new TorusGeometry(radius, 0.028, 8, 64)
    const innerRim = new TorusGeometry(radius - 0.07, 0.012, 6, 64)
    const iron: Array<BufferGeometry> = [
      rim.rotateX(Math.PI / 2),
      innerRim.rotateX(Math.PI / 2),
      new CylinderGeometry(0.1, 0.1, 0.14, 16),
      place(new SphereGeometry(0.05, 12, 8), 0, -0.1, 0),
    ]
    const wax: Array<BufferGeometry> = []
    const flames: Array<BufferGeometry> = []
    for (let i = 0; i < candles; i++) {
      const angle = (i + 0.5) * Math.PI * 2 / candles
      const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle))
      iron.push(rod(direction.clone().multiplyScalar(0.09), direction.clone().multiplyScalar(radius), 0.016))
      const [x, z] = [direction.x * radius, direction.z * radius]
      iron.push(place(new CylinderGeometry(0.048, 0.03, 0.045, 14), x, 0.045, z))
      // Each candle has burned down a little differently.
      const candleHeight = 0.12 + i * 0.37 % 1 * 0.06
      wax.push(place(new CylinderGeometry(0.026, 0.028, candleHeight, 12), x, 0.07 + candleHeight / 2, z))
      const flame = new SphereGeometry(0.016, 8, 6)
      flames.push(place(flame.scale(1, 2.4, 1), x, 0.07 + candleHeight + 0.035, z))
    }
    // Three chains gather to a ring above the hub; a rod rises to the canopy.
    const gather = new Vector3(0, Math.min(0.55, drop - 0.25), 0)
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3
      iron.push(rod(new Vector3(Math.cos(angle) * radius, 0.02, Math.sin(angle) * radius), gather, 0.007, 4))
    }
    iron.push(place(new TorusGeometry(0.035, 0.01, 6, 16), gather.x, gather.y, gather.z), rod(gather, new Vector3(0, drop, 0), 0.012), place(new CylinderGeometry(0.07, 0.11, 0.05, 20), 0, drop - 0.025, 0))
    this.iron = mergeParts(iron)
    this.wax = mergeParts(wax)
    this.flames = mergeParts(flames)
  }

  dispose() {
    this.iron.dispose()
    this.wax.dispose()
    this.flames.dispose()
  }
}

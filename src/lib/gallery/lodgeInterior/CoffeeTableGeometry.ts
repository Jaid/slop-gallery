import type {Vec3} from '../types.ts'
import type {BufferGeometry} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {place, roundedBox} from './place.ts'

/** A thick slab table on four slightly splayed square legs with aprons and a lower shelf. The origin is on the floor under its middle. */
export default class CoffeeTableGeometry {
  readonly timber: BufferGeometry

  constructor([width, height, depth]: Vec3) {
    if (![width, height, depth].every(value => Number.isFinite(value) && value > 0.2)) {
      throw new RangeError('A table needs finite dimensions over 20 cm.')
    }
    const slab = 0.075
    const leg = 0.085
    const legHeight = height - slab
    const parts: Array<BufferGeometry> = [place(roundedBox([width, slab, depth], 0.02), 0, height - slab / 2, 0)]
    // Aprons under the slab tie the legs together.
    for (const side of [-1, 1]) {
      parts.push(
        place(roundedBox([width - 0.24, 0.07, 0.04], 0.008, 2), 0, legHeight - 0.035, side * (depth / 2 - 0.1)),
        place(roundedBox([0.04, 0.07, depth - 0.24], 0.008, 2), side * (width / 2 - 0.1), legHeight - 0.035, 0),
      )
    }
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        const block = roundedBox([leg, legHeight, leg], 0.01, 2)
        // Splayed outward a little, the way a country table leans its legs.
        parts.push(place(block.rotateZ(x * 0.06).rotateX(-z * 0.06), x * (width / 2 - 0.12), legHeight / 2, z * (depth / 2 - 0.12)))
      }
    }
    parts.push(place(roundedBox([width - 0.3, 0.035, depth - 0.25], 0.01, 2), 0, 0.13, 0))
    this.timber = mergeParts(parts)
  }

  dispose() {
    this.timber.dispose()
  }
}

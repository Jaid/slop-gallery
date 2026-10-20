import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {roundedBox} from '../lodgeInterior/place.ts'
import RevolvedProfileGeometry from '../RevolvedProfileGeometry.ts'
import dineTable from './layout.ts'
import {slab, stringing, timber} from './parts.ts'

/** An edged walnut banqueting board on three paired, turned trestles, tied together by low stretchers. */
export default class FeastTableGeometry {
  readonly brass: BufferGeometry
  readonly wood: BufferGeometry

  constructor() {
    const {width, length, height, topThickness, cornerRadius, trestles} = dineTable
    const wood: Array<BufferGeometry> = [timber(slab(width, length - 0.4, topThickness, 0.025, height), 'z', 0.17)]
    const brass: Array<BufferGeometry> = []
    // The deep ogee edge and two narrow stringing lines give the long top a readable silhouette without a heavy gilded surface.
    wood.push(timber(slab(width - 0.065, length - 0.065, 0.055, cornerRadius, height - 0.065, 0.012), 'z', 0.24))
    brass.push(stringing(width - 0.19, length - 0.19, 0.08, 0.008, height + 0.0006))
    brass.push(stringing(width - 0.27, length - 0.27, 0.065, 0.003, height + 0.0007))
    for (const side of [-1, 1]) {
      // Recessed aprons and a bead beneath them; there is still knee room under the tabletop’s overhang.
      wood.push(timber(roundedBox([0.055, 0.12, length - 0.5], 0.009, 1), 'z', 0.33 + side * 0.04).translate(side * 0.93, height - 0.18, 0))
      const bead = new BoxGeometry(0.006, 0.008, length - 0.54)
      brass.push(bead.translate(side * 0.96, height - 0.205, 0))
      wood.push(timber(roundedBox([0.1, 0.12, trestles.at(-1)! - trestles[0] + 0.2], 0.014, 1), 'z', 0.49).translate(side * 0.62, 0.24, 0))
    }
    for (const [index, z] of trestles.entries()) {
      wood.push(timber(slab(2.02, 0.58, 0.12, 0.1, 0.14), 'x', index + 0.1).translate(0, 0, z))
      wood.push(timber(roundedBox([2.04, 0.085, 0.36], 0.018, 1), 'x', index + 0.2).translate(0, 0.685, z))
      // Low, spreading feet are capped with small brass shoes; the balusters have smooth radial normals.
      for (const side of [-1, 1]) {
        const x = side * 0.62
        const leg = new RevolvedProfileGeometry([
          [0, 0.65],
          [0.145, 0.65],
          [0.145, 0.615],
          [0.105, 0.595],
          [0.095, 0.55],
          [0.145, 0.49],
          [0.17, 0.43],
          [0.165, 0.39],
          [0.13, 0.35],
          [0.09, 0.31],
          [0.085, 0.25],
          [0.13, 0.22],
          [0.14, 0.18],
          [0.14, 0.14],
          [0, 0.14],
        ], {sides: 24})
        wood.push(timber(leg, 'y', index + side * 0.21).translate(x, 0, z))
        brass.push(slab(0.21, 0.46, 0.025, 0.04, 0.025, 0.004).translate(side * 0.86, 0, z))
      }
    }
    // Separate, cross-grained breadboard ends meet the long board across a fine joinery seam.
    for (const side of [-1, 1]) {
      wood.push(timber(slab(width, 0.196, topThickness, 0.08, height), 'x', 0.8 + side * 0.05).translate(0, 0, side * (length / 2 - 0.1)))
    }
    this.wood = mergeParts(wood)
    this.brass = mergeParts(brass)
  }

  dispose() {
    this.wood.dispose()
    this.brass.dispose()
  }
}

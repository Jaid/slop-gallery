import type {FunnelPoint} from './FunnelGeometry.ts'
import type {BufferGeometry} from 'three/webgpu'

import {Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {forgeHopper} from './forgeGutter.ts'
import FunnelGeometry from './FunnelGeometry.ts'
import {place, rod, roundedBox} from './lodgeInterior/place.ts'
import {salonCeiling} from './salon.ts'
import {withWoodGrain} from './woodGrain.ts'

/** how thick the brass of the funnel is */
const brass = 0.01
/** how far the leather cushion on the backstop’s face swells out of its board */
const cushion = 0.05
/** the radius of the iron rods the hopper hangs from */
const hangerRod = 0.008

/**
 * The hopper behind the round opening the alchemy machine’s cannon shoots through, see {@link forgeHopper}, in its own frame round the middle of the funnel’s rim: the brass `funnel`, the oak board of the backstop, tufted leather over its face, and the iron rods both hang from the ceiling by.
 */
export default class HopperGeometry {
  readonly board: BufferGeometry
  readonly cushion: BufferGeometry
  readonly funnel: FunnelGeometry
  readonly iron: BufferGeometry

  constructor() {
    const {backstop, funnel} = forgeHopper
    const [, rimY, centerZ] = funnel.center
    const cone = (funnel.radius - funnel.throat) * Math.tan(funnel.slope)
    const inside: Array<FunnelPoint> = [
      [funnel.radius, 0],
      [funnel.throat, -cone],
      [funnel.throat, -funnel.depth],
    ]
    this.funnel = new FunnelGeometry(inside, brass, 'rolled')
    // The board behind the cushion, its face where the cushion’s back is, the cushion’s face where the backstop’s is
    const face = backstop.face - centerZ
    const [bottom, top] = [backstop.bottom - rimY, backstop.top - rimY]
    const height = top - bottom
    const boardDepth = backstop.thickness - cushion
    // Its grain running across it
    this.board = place(withWoodGrain(roundedBox([backstop.width, height, boardDepth], 0.01), (x, y, z) => [x + 7, y + z * 0.3], 0.47), 0, (bottom + top) / 2, face - cushion - boardDepth / 2)
    this.cushion = place(roundedBox([backstop.width - 0.04, height - 0.04, cushion], 0.022, 4), 0, (bottom + top) / 2, face - cushion / 2)
    // Two rods up from the funnel’s rim on either side and two from the board’s top corners
    const ceiling = salonCeiling.underside - rimY
    const rods: Array<BufferGeometry> = []
    for (const side of [-1, 1]) {
      rods.push(
        rod(new Vector3(side * (funnel.radius + brass), 0, 0), new Vector3(side * (funnel.radius + brass), ceiling, 0), hangerRod),
        rod(new Vector3(side * (backstop.width / 2 - 0.05), top, face - backstop.thickness / 2), new Vector3(side * (backstop.width / 2 - 0.05), ceiling, face - backstop.thickness / 2), hangerRod),
      )
    }
    this.iron = mergeParts(rods)
  }

  dispose() {
    for (const geometry of [this.board, this.cushion, this.iron]) {
      geometry.dispose()
    }
    this.funnel.dispose()
  }
}

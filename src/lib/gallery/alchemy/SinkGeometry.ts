import type {FunnelPoint} from '../FunnelGeometry.ts'

import FunnelGeometry from '../FunnelGeometry.ts'
import {alchemySink, machineBody, workbench} from './alchemyMachine.ts'

/** how many straight pieces the bowl’s curve is cut into */
const curveSteps = 16
/** how far the flange round the sink’s rim lies out over the bench’s top */
const flange = 0.028
/** how far the flange stands over the bench’s top */
const lift = 0.0015

/**
 * The sink of the alchemy machine, see {@link alchemySink}, in its own frame round the middle of its rim, flush with the bench’s top: hammered brass running straight down through the top, curving in to the throat and down it into the machine’s body, turned out flat at its rim into a thin flange lying on the top round the hole.
 */
export default class SinkGeometry extends FunnelGeometry {
  constructor() {
    const {curve, radius, sweep, throat, thickness} = alchemySink
    const under = -workbench.top
    // The last one where the bowl meets the throat
    const bowl = Array.from({length: curveSteps}, (_, index): FunnelPoint => {
      const angle = sweep * (index + 1) / curveSteps
      return [radius - curve * (1 - Math.cos(angle)), under - curve * Math.sin(angle)]
    })
    // Down into the body, a little under its lid
    const bottom = machineBody.size[1] - 0.03 - workbench.height
    super([[radius, lift], [radius, under], ...bowl, [throat, bottom]], thickness, flange)
  }
}

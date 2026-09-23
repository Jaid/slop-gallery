import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_cell_noise_float, mx_noise_float, vec3} from 'three/tsl'

import {loopOsc, loopPhase} from '../../candidates/deepseek/lib/loopClock.ts'
import {cellularBoundary} from '../../lib/cellularBoundary.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {TAU} from '../../lib/TAU.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/**
 * A cooled basalt lid over something that has not finished erupting. Voronoi plates rise between their seams, and each plate opens on its own phase of the two-second loop, so the crust breathes unevenly. The seams are the only place the interior can be seen: a white-hot line where the cell boundary runs, a molten flow that slides along it, and a warm halo soaking into the surrounding rock. Both the magma and the halo are widened by the screen footprint of the seam field, so a narrowing channel dims and spreads instead of sparkling, and standing close opens the cracks further while the air above them starts to shiver.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.6)
    this.name = knotData.id
    const {p, facing, grazing, distance, intimate, near} = viewerFrame()
    const scale = p.mul(8)
    const seam = cellularBoundary(scale)
    const filter = seam.fwidth().mul(0.6)
    const plate = mx_cell_noise_float(scale)
    const identity = mx_cell_noise_float(scale.add(4.7))
    const breath = loopOsc(1, identity.mul(TAU)).mul(0.5).add(0.5)
    const opening = breath.mul(near.mul(0.014).add(0.014)).add(intimate.mul(0.006)).add(0.014)
    const crack = seam.sub(opening)
    const molten = crack.negate().div(opening.add(filter).max(0.004)).clamp()
    const whiteHot = molten.pow(1.6)
    const halo = crack.add(filter).smoothstep(-0.02, 0.075).oneMinus()
    const flowBright = loopPhase.mul(3).add(seam.mul(22)).sin().mul(0.5).add(0.5).mul(0.5).add(0.5)
    const plateHeight = seam.smoothstep(0.015, 0.3)
    const rubble = mx_noise_float(p.mul(42)).mul(0.5).add(0.5)
    const pores = mx_noise_float(p.mul(110)).mul(0.5).add(0.5)
    const shimmer = loopOsc(1, p.dot(vec3(3.1, 1.7, -2.3))).mul(0.5).add(0.62)
    const haze = mx_noise_float(p.mul(40)).mul(0.5).add(0.5).mul(shimmer).mul(halo).mul(intimate)
    const rockTone = mix(color('#080705'), color('#1c1917'), mx_noise_float(p.mul(5.5)).mul(0.5).add(0.5))
    const ash = mix(color('#201d19'), color('#332e28'), rubble)
    const crust = mix(mix(rockTone, mix(rockTone, ash, 0.32), plate.mul(0.55).add(0.15)), color('#3a1505'), halo.mul(0.4))
    this.colorNode = mix(crust, color('#5c2a0c'), molten.mul(0.55))
    this.roughnessNode = mix(float(0.5).sub(near.mul(0.12)), float(0.16), molten.mul(0.85)).add(rubble.mul(0.1)).sub(haze.mul(0.05)).clamp(0.08, 0.72)
    this.metalness = 0
    this.normalNode = proceduralNormal(plateHeight.mul(0.42).add(rubble.mul(0.03)).add(pores.mul(0.02)).add(haze.mul(0.05)), 0.0032)
    this.emissiveNode = color('#fff4d4').mul(whiteHot.mul(flowBright).mul(facing.mul(0.45).add(0.55)).mul(2.1))
      .add(color('#ff8a1e').mul(molten.mul(flowBright).mul(1.1)))
      .add(color('#c2330a').mul(halo.mul(halo).mul(breath.mul(0.4).add(0.6)).mul(0.3)))
      .add(color('#ffb457').mul(haze.mul(0.1)))
      .add(color('#6e3a12').mul(grazing.pow(3)).mul(0.05))
      .add(color('#3d1405').mul(distance.smoothstep(0.9, 3).oneMinus()).mul(0.05))
  }
}

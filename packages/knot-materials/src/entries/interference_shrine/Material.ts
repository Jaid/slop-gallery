import type {Texture} from 'three/webgpu'

import {color, mix, modelWorldMatrixInverse, mx_cell_noise_float, normalViewGeometry, reflectVector, time, uv, vec3, vec4} from 'three/tsl'

import {glints} from '../../lib/glints.ts'
import {hairline as opticalLine} from '../../lib/hairline.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {opticalBands} from '../../lib/opticalBands.ts'
import {spectralColor} from '../../lib/spectralColor.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'
import {interferenceLattice} from './util.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    // A diffraction shrine: every orbit sweeps a new rainbow across its face,
    // and the inner lattice collapses into rings whenever it is "measured".
    const {p, view, facing, grazing, near, intimate} = viewerFrame()
    const tube = uv()
    const reflLocal = modelWorldMatrixInverse.mul(vec4(reflectVector, 0)).xyz
    const hue = reflLocal.x.mul(6.5).add(reflLocal.z.mul(4.5)).add(reflLocal.y.mul(3))
    const diffraction = spectralColor(hue)
    const order2 = spectralColor(hue.mul(1.35).add(1.1))
    const grooves = opticalBands(tube.y.mul(Math.PI * 2 * 18))
    const tick = time.mul(0.8).floor()
    const measure = mx_cell_noise_float(vec3(tick, 6.6, 2.2)).smoothstep(0.42, 0.72)
    const frac = time.mul(0.8).fract()
    const emitter = p.sub(view.mul(0.16))
    const ringPhase = emitter.length().mul(36).sub(frac.mul(9))
    const packet = frac.smoothstep(0.02, 0.18).mul(frac.smoothstep(0.55, 0.98))
    const rings = opticalLine(ringPhase.sin(), 0.22).mul(packet)
    const flash = measure.mul(frac.mul(-9).exp())
    const lattice = interferenceLattice(p.mul(9.5))
    this.colorNode = mix(mix(color('#0a0c15'), diffraction, 0.7), order2, grooves.mul(0.35))
    this.metalness = 1
    this.roughnessNode = grooves.mul(0.05).add(0.09)
    this.anisotropy = 0.6
    this.iridescence = 0.8
    this.iridescenceIOR = 1.6
    this.iridescenceThicknessNode = facing.mul(380).add(140)
    this.clearcoat = 0.5
    this.clearcoatRoughness = 0.1
    this.emissiveNode = color('#7fe0ff').mul(rings).mul(measure).mul(2.2).mul(near.mul(0.5).add(intimate.mul(0.3)).add(0.35)).add(lattice.mul(0.55).mul(near.mul(0.7).add(0.3))).add(diffraction.mul(flash).mul(1.4)).add(spectralColor(hue.mul(0.6).add(facing.mul(3))).mul(grazing.pow(2.5)).mul(0.55)).add(diffraction.mul(glints(normalViewGeometry, 180)).mul(near).mul(0.45))
  }
}

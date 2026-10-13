import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, normalLocal} from 'three/tsl'

import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {cellularBoundary} from '../../lib/cellularBoundary.ts'
import {glints} from '../../lib/glints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/** Derivative-free crystal relief, also usable in the vertex stage. */
const relief = (q: Node<'vec3'>) => cellularBoundary(q).clamp(0, 1)
/** A geode choir: dozens of violet crystal cells share one stone, every cell tinted and tilted differently, so walking around it sets off cold glints one throat at a time while its depths stay smoky and lit from within. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1)
    this.name = knotData.id
    const {p, near, intimate} = viewerFrame()
    this.positionNode = p.add(normalLocal.normalize().mul(relief(p.mul(7)).mul(0.007).add(mx_noise_float(p.mul(11)).mul(0.0015))))
    const boundary = relief(p.mul(7))
    const fineBoundary = relief(p.mul(15).add(7.3))
    const identity = cellNoiseVec3(p.mul(7).floor())
    const depth = boundary.pow(1.6)
    const tint = mix(color('#240748'), color('#7c2ce0'), identity.x)
    const crowned = mix(tint, color('#c4a6ff'), depth.mul(identity.y.mul(0.45).add(0.12)))
    this.colorNode = mix(crowned, color('#efe8ff'), fineBoundary.pow(3).mul(0.25).mul(identity.z))
    this.transmission = 0.24
    this.thickness = 0.42
    this.ior = 1.77
    this.dispersion = 0.5
    this.attenuationColor.set('#7b3fd4')
    this.attenuationDistance = 0.38
    this.metalness = 0
    this.roughnessNode = float(0.17).sub(depth.mul(0.08)).add(identity.z.mul(0.07)).clamp(0.05, 0.3)
    this.clearcoat = 1
    this.clearcoatRoughness = 0.06
    const facetNormal = proceduralNormal(boundary.mul(0.8).add(fineBoundary.mul(0.25)), 1.15)
    this.normalNode = facetNormal
    this.emissiveNode = color('#8b4dff')
      .mul(depth.pow(2))
      .mul(near.mul(0.4).add(0.08))
      .add(color('#f2eaff').mul(glints(facetNormal, 170)).mul(intimate.mul(1.3).add(0.25)))
  }
}

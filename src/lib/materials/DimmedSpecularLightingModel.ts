import type {LightingModelDirectInput, Node, NodeBuilder} from 'three/webgpu'

import {diffuseContribution, normalView} from 'three/tsl'
import {PhysicalLightingModel} from 'three/webgpu'

/**
 * Physical lighting whose punctual lights leave only a share of their specular highlight; the rest of their light is scattered diffusely, so the surface stays as bright.
 *
 * Turning `specularColor` down is not enough for that: three’s direct GGX hard-codes a Fresnel f90 of 1, so every lamp still leaves a glint at grazing angles.
 */
export default class DimmedSpecularLightingModel extends PhysicalLightingModel {
  constructor(readonly specularShare: number) {
    super()
  }
  override direct(input: LightingModelDirectInput, builder: NodeBuilder) {
    const lightColor = input.lightColor as Node<'vec3'>
    const lightDirection = input.lightDirection as Node<'vec3'>
    super.direct({
      ...input,
      lightColor: lightColor.mul(this.specularShare),
    }, builder)
    const irradiance = normalView.dot(lightDirection).clamp().mul(lightColor).mul(1 - this.specularShare)
    const directDiffuse = input.reflectedLight.directDiffuse as Node<'vec3'>
    // Lambert: the diffuse color over π
    directDiffuse.addAssign(irradiance.mul(diffuseContribution).div(Math.PI))
  }
}

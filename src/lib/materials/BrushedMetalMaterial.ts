import type {Texture} from 'three/webgpu'

import {float, max, mx_noise_float, positionLocal, vec3} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {heightNormal, visibleDetail} from './filters.ts'

/** Normal-incidence reflectance of satin stainless steel, in linear RGB. */
export const steelReflectance = [0.56, 0.59, 0.62] as const

/**
 * Satin stainless steel with soft, view-dependent reflections rather than a painted gray diffuse lobe.
 *
 * A static HDR environment supplies the pseudo-reflections; this is ordinary filtered PBR environment lighting, not a scene capture or a screen-space pass. Direct lights and shadows still work normally. The slight cool tint belongs to the conductor, not to an emissive highlight painted onto it.
 *
 * Subtle polishing variation and fine brushing use local meters, so they stay attached to instanced or grabbed objects. The brushing is stretched vertically and fades before it becomes subpixel. Surface-gradient normals work without UVs or tangents, including on merged bench frames and the continuous bent handrail.
 *
 * The caller owns the optional environment. Disposing a material must not dispose a texture shared with another material.
 */
export default class BrushedMetalMaterial extends MeshStandardNodeMaterial {
  constructor({environment, environmentIntensity = 0.5}: {
    environment?: Texture
    environmentIntensity?: number
  } = {}) {
    super({
      envMap: environment ?? null,
      envMapIntensity: environmentIntensity,
      metalness: 1,
      roughness: 0.26,
    })
    this.name = 'Satin stainless steel'
    const position = positionLocal
    const wear = mx_noise_float(position.mul(3.5)).mul(0.5).add(0.5).toVar('steelWear')
    const footprint = max(position.x.fwidth(), position.z.fwidth())
    const brushing = mx_noise_float(position.mul(vec3(420, 3, 420))).mul(visibleDetail(footprint, 1 / 420)).toVar('steelBrushing')
    this.colorNode = vec3(...steelReflectance).mul(float(1).sub(wear.mul(0.035)))
    this.roughnessNode = float(0.23).add(wear.mul(0.06)).add(brushing.mul(0.025))
    this.normalNode = heightNormal(brushing.mul(0.000008))
  }
}

import type {Node} from 'three/webgpu'

import {exp, float, sqrt, vec3} from 'three/tsl'

type Float = Node<'float'>

export const waterIor = 1.333
/** Normal-incidence reflectance of a water surface in air. */
export const waterReflectance = ((waterIor - 1) / (waterIor + 1)) ** 2
/**
 * How strongly clear fountain water absorbs red, green and blue light, per meter of travel.
 *
 * Pure water mostly absorbs red; the fine silt and algae of a real basin add a little green-blue scattering, which this folds in.
 * A few centimeters stay crystal clear, half a meter leaves an aqua cast and a meter and more turns teal.
 */
export const waterAbsorption = [1.6, 0.5, 0.56] as const

/** Share of the light that survives `distance` meters through the water, per channel. */
export function waterTransmittance(distance: Float) {
  return exp(vec3(...waterAbsorption).mul(distance).negate())
}

/** Schlick’s Fresnel reflectance of water for the cosine between its normal and the view direction. */
export function waterFresnel(cosine: Float) {
  return float(waterReflectance).add(float(1 - waterReflectance).mul(float(1).sub(cosine.clamp(0, 1)).pow(5)))
}

/** Cosine of the refracted ray inside the water for the cosine of the incoming one. */
export function refractedCosine(cosine: Float) {
  return sqrt(float(1).sub(float(1).sub(cosine.mul(cosine)).div(waterIor * waterIor)))
}

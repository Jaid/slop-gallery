import type {AntiAliasing} from './antiAliasing.ts'

import {create} from 'zustand'

/** Everything `?graphics=custom` lets the tuning panel change in the render pipeline. It starts out as cinematic. */
export type CustomGraphics = {
  ambientOcclusion: boolean
  ambientOcclusionRadius: number
  /** ambient occlusion pixels per output pixel along each axis */
  ambientOcclusionResolutionScale: number
  ambientOcclusionSamples: number
  ambientOcclusionScale: number
  ambientOcclusionThickness: number
  antiAliasing: AntiAliasing
  bloom: boolean
  bloomRadius: number
  bloomStrength: number
  bloomThreshold: number
  /** whether a spatial pass smooths the contact shadows */
  contactShadowDenoise: boolean
  contactShadowDistance: number
  contactShadowIntensity: number
  contactShadowQuality: number
  contactShadows: boolean
  contactShadowThickness: number
  /** whether the output dithers by half an 8-bit step, so smooth, dark gradients don’t band */
  dither: boolean
  /** floor reflection pixels per output pixel along each axis */
  reflectionResolutionScale: number
  screenSpaceIndirectLight: boolean
  screenSpaceIndirectLightIntensity: number
  screenSpaceIndirectLightRadius: number
  screenSpaceIndirectLightSlices: number
  screenSpaceIndirectLightSteps: number
  vignette: number
  volumetricLight: boolean
  volumetricLightDensity: number
  volumetricLightMaxDensity: number
  volumetricLightSteps: number
  voxelIndirectLight: boolean
  voxelIndirectLightBounces: number
  voxelIndirectLightIntensity: number
}

export type CustomGraphicsKey = keyof CustomGraphics

/** the knobs that change which passes the pipeline has, so changing one builds it anew; every other knob is a uniform that changes live */
export const customGraphicsStructure = ['ambientOcclusion', 'ambientOcclusionResolutionScale', 'antiAliasing', 'bloom', 'contactShadowDenoise', 'contactShadows', 'dither', 'reflectionResolutionScale', 'screenSpaceIndirectLight', 'volumetricLight', 'voxelIndirectLight'] as const satisfies Array<CustomGraphicsKey>

export type CustomGraphicsStructure = Pick<CustomGraphics, typeof customGraphicsStructure[number]>

export type CustomGraphicsUniform = {[Key in CustomGraphicsKey]: CustomGraphics[Key] extends number ? (Key extends typeof customGraphicsStructure[number] ? never : Key) : never}[CustomGraphicsKey]

/** the cinematic pipeline, which the panel starts from and resets to */
export const defaultCustomGraphics: CustomGraphics = {
  ambientOcclusion: true,
  ambientOcclusionRadius: 0.3,
  ambientOcclusionResolutionScale: 1.5,
  ambientOcclusionSamples: 32,
  ambientOcclusionScale: 0.85,
  ambientOcclusionThickness: 1,
  antiAliasing: 'traa',
  bloom: true,
  bloomRadius: 0.25,
  bloomStrength: 0.18,
  bloomThreshold: 1,
  contactShadowDenoise: true,
  contactShadowDistance: 0.1,
  contactShadowIntensity: 0.7,
  contactShadowQuality: 1,
  contactShadows: false,
  contactShadowThickness: 0.01,
  dither: true,
  reflectionResolutionScale: 2,
  screenSpaceIndirectLight: true,
  screenSpaceIndirectLightIntensity: 4,
  screenSpaceIndirectLightRadius: 12,
  screenSpaceIndirectLightSlices: 3,
  screenSpaceIndirectLightSteps: 16,
  vignette: 0.2,
  volumetricLight: true,
  volumetricLightDensity: 8,
  volumetricLightMaxDensity: 3,
  volumetricLightSteps: 120,
  voxelIndirectLight: true,
  voxelIndirectLightBounces: 2,
  voxelIndirectLightIntensity: 0.05,
}

/** the tuning panel’s values, which a pipeline built with `custom` follows */
export const useCustomGraphics = create<CustomGraphics>(() => defaultCustomGraphics)

/** whether focus is in the tuning panel, which hides the pause menu so the scene shows every change */
export const useGraphicsTuningFocus = create<boolean>(() => false)

/** Pick the knobs a pipeline is built from. */
export function getCustomGraphicsStructure(state: CustomGraphics): CustomGraphicsStructure {
  return Object.fromEntries(customGraphicsStructure.map(key => [key, state[key]])) as CustomGraphicsStructure
}

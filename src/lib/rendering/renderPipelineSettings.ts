import type {AntiAliasing} from './antiAliasing.ts'
import type {GraphicsProfile} from './graphicsMode.ts'

import {isKnottingham} from '../level.ts'

/** which surfaces reflect: none, the reflective floors through their shared planar mirror, or those plus screen-space reflections on metallic surfaces */
export type ReflectionScope = 'all' | 'floors' | 'none'

/** Every value the render pipeline is built from. The graphics mode fills them in; the tuning panel of `?development` changes them. */
export type RenderPipelineSettings = {
  ambientOcclusion: boolean
  ambientOcclusionRadius: number
  /** ambient occlusion pixels per output pixel along each axis */
  ambientOcclusionResolutionScale: number
  ambientOcclusionSamples: number
  ambientOcclusionScale: number
  ambientOcclusionTemporalFiltering: boolean
  ambientOcclusionThickness: number
  antiAliasing: AntiAliasing
  bloom: boolean
  /** brightest luminance one pixel may feed into bloom. Intended glow sources (chandelier flames, emissive veins) peak around 4; sharp specular fireflies reach hundreds. */
  bloomLuminanceCap: number
  bloomRadius: number
  bloomSmoothWidth: number
  bloomStrength: number
  bloomThreshold: number
  contactShadowDenoise: boolean
  contactShadowDenoiseRadius: number
  contactShadowDistance: number
  contactShadowIntensity: number
  contactShadowQuality: number
  contactShadowResolutionScale: number
  contactShadows: boolean
  contactShadowThickness: number
  /** whether the output dithers by half an 8-bit step, so smooth, dark gradients don’t band */
  dither: boolean
  /** floor reflection pixels per output pixel along each axis */
  reflectionResolutionScale: number
  reflectionScope: ReflectionScope
  screenSpaceIndirectLight: boolean
  screenSpaceIndirectLightAmbientOcclusion: number
  screenSpaceIndirectLightBackfaceLighting: number
  screenSpaceIndirectLightExpFactor: number
  screenSpaceIndirectLightIntensity: number
  screenSpaceIndirectLightRadius: number
  screenSpaceIndirectLightSlices: number
  screenSpaceIndirectLightSteps: number
  screenSpaceIndirectLightTemporalFiltering: boolean
  screenSpaceIndirectLightThickness: number
  screenSpaceReflectionDistance: number
  screenSpaceReflectionIntensity: number
  screenSpaceReflectionResolutionScale: number
  screenSpaceReflectionThickness: number
  vignette: number
  volumetricLight: boolean
  /** the Gaussian blur’s sigma over the raymarched shafts */
  volumetricLightBlur: number
  volumetricLightDensity: number
  volumetricLightDistanceAttenuation: number
  volumetricLightMaxDensity: number
  volumetricLightResolutionScale: number
  volumetricLightSteps: number
  voxelIndirectLight: boolean
  voxelIndirectLightBounces: number
  voxelIndirectLightConeAngle: number
  voxelIndirectLightConeCount: number
  voxelIndirectLightIntensity: number
  /** voxels along each axis of the volume */
  voxelIndirectLightResolution: number
}

export type RenderPipelineSetting = keyof RenderPipelineSettings

/** the settings that change which passes the pipeline has or how they are set up, so changing one builds it anew; every other setting is a uniform that can change live */
export const renderPipelineStructure = ['ambientOcclusion', 'ambientOcclusionResolutionScale', 'ambientOcclusionTemporalFiltering', 'antiAliasing', 'bloom', 'contactShadowDenoise', 'contactShadowResolutionScale', 'contactShadows', 'dither', 'reflectionResolutionScale', 'reflectionScope', 'screenSpaceIndirectLight', 'screenSpaceIndirectLightTemporalFiltering', 'screenSpaceReflectionResolutionScale', 'volumetricLight', 'volumetricLightBlur', 'volumetricLightResolutionScale', 'voxelIndirectLight', 'voxelIndirectLightResolution'] as const satisfies Array<RenderPipelineSetting>

export type RenderPipelineStructure = Pick<RenderPipelineSettings, typeof renderPipelineStructure[number]>

/** the settings a pipeline can change live */
export type RenderPipelineUniform = {[Key in RenderPipelineSetting]: RenderPipelineSettings[Key] extends number ? (Key extends typeof renderPipelineStructure[number] ? never : Key) : never}[RenderPipelineSetting]

/** The render pipeline of a graphics profile. */
export function getRenderPipelineSettings(profile: GraphicsProfile, antiAliasing: AntiAliasing): RenderPipelineSettings {
  return {
    ambientOcclusion: true,
    // Knottingham darkens contacts more tightly.
    ambientOcclusionRadius: isKnottingham ? 0.18 : 0.3,
    ambientOcclusionResolutionScale: profile.ambientOcclusionResolutionScale,
    ambientOcclusionSamples: profile.ambientOcclusionSamples,
    ambientOcclusionScale: isKnottingham ? 1.18 : 0.85,
    ambientOcclusionTemporalFiltering: false,
    ambientOcclusionThickness: isKnottingham ? 0.6 : 1,
    antiAliasing,
    bloom: profile.postprocessing,
    bloomLuminanceCap: 4,
    bloomRadius: 0.3,
    bloomSmoothWidth: 0.5,
    bloomStrength: 1,
    bloomThreshold: 2,
    contactShadowDenoise: true,
    contactShadowDenoiseRadius: 5,
    contactShadowDistance: 0.1,
    contactShadowIntensity: 0.7,
    contactShadowQuality: 1,
    contactShadowResolutionScale: 1,
    contactShadows: false,
    contactShadowThickness: 0.01,
    dither: false,
    reflectionResolutionScale: profile.reflectionResolutionScale,
    reflectionScope: profile.floorReflections ? 'floors' : 'none',
    screenSpaceIndirectLight: profile.indirectLight,
    screenSpaceIndirectLightAmbientOcclusion: 0,
    screenSpaceIndirectLightBackfaceLighting: 0,
    screenSpaceIndirectLightExpFactor: 2,
    screenSpaceIndirectLightIntensity: 4,
    screenSpaceIndirectLightRadius: 12,
    screenSpaceIndirectLightSlices: 3,
    screenSpaceIndirectLightSteps: 16,
    screenSpaceIndirectLightTemporalFiltering: antiAliasing === 'traa',
    screenSpaceIndirectLightThickness: 1,
    screenSpaceReflectionDistance: 4,
    screenSpaceReflectionIntensity: 1,
    screenSpaceReflectionResolutionScale: 1,
    screenSpaceReflectionThickness: 0.1,
    vignette: 0,
    volumetricLight: profile.volumetricLight,
    volumetricLightBlur: 0,
    volumetricLightDensity: 20,
    volumetricLightDistanceAttenuation: 2.5,
    volumetricLightMaxDensity: 1,
    volumetricLightResolutionScale: 0.25,
    volumetricLightSteps: profile.volumetricLightSteps,
    voxelIndirectLight: profile.indirectLight,
    voxelIndirectLightBounces: 2,
    voxelIndirectLightConeAngle: 40,
    voxelIndirectLightConeCount: 3,
    voxelIndirectLightIntensity: 0.05,
    voxelIndirectLightResolution: 256,
  }
}

/** Pick the settings a pipeline is built from. */
export function getRenderPipelineStructure(settings: RenderPipelineSettings): RenderPipelineStructure {
  return Object.fromEntries(renderPipelineStructure.map(key => [key, settings[key]])) as RenderPipelineStructure
}

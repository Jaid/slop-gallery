import type {RenderPipelineSettings} from './renderPipelineSettings.ts'

import optis from 'optis'
import readPermalink from 'read-permalink'
import useGraphicsMode from 'use-graphics-mode'

type GraphicsModeName = ReturnType<typeof useGraphicsMode.getName>

const graphicsModeNames: Array<GraphicsModeName> = [useGraphicsMode.getName(false), useGraphicsMode.getName(true), useGraphicsMode.getName(true, true)]
const normalizeGraphicsMode = (value: unknown): GraphicsModeName => {
  if (value === true) {
    return useGraphicsMode.getName(true)
  }
  return graphicsModeNames.find(name => name === value) ?? useGraphicsMode.getName(false)
}
const graphicsModeSchema = optis({
  defaults: {
    graphics: useGraphicsMode.getName(false),
  },
  normalizations: {
    graphics: normalizeGraphicsMode,
  },
})

export type GraphicsProfile = {
  /** ambient occlusion pixels per output pixel along each axis */
  ambientOcclusionRadius?: number
  ambientOcclusionResolutionScale: number
  /** ambient occlusion samples per pixel */
  ambientOcclusionSamples: number
  ambientOcclusionScale?: number
  ambientOcclusionThickness?: number
  /** whether runtime canvas textures such as signs keep mipmaps, and with them anisotropic filtering, at the cost of building them */
  canvasTextureMipmaps: boolean
  /** backing pixels per logical texel for runtime canvas textures such as signs */
  canvasTextureResolution: number
  floorReflections: boolean
  /** whether screen-space indirect light bounces the lit scene off the surfaces’ diffuse color */
  indirectLight: boolean
  noiseTextures: boolean
  postprocessing: boolean
  /** floor reflection pixels per output pixel along each axis */
  reflectionResolutionScale: number
  /** factor on every shadow map’s size along each axis */
  shadowMapScale: number
  shadows: boolean
  /** shadow map lookups per pixel and light */
  shadowSamples: number
  /** optional screen-space indirect-light quality overrides */
  ssgi?: SsgiSettings
  /** absolute sun shadow-map size, independent of the other lights’ shadow-map scale */
  sunShadowMapSize?: number
  /** sun shadow filter radius, in shadow-map texels */
  sunShadowRadius?: number
  /** sun-only PCF lookup count; defaults to the other lights’ shadow sample count */
  sunShadowSamples?: number
  /** anisotropic filtering of the repeating procedural surfaces like plaster, stone and wood */
  surfaceAnisotropy: number
  /** whether the sun scatters through the air as shafts of light */
  volumetricLight: boolean
  /** Number of raymarching samples for volumetric sunlight. */
  volumetricLightSteps: number
  /** whether voxel cone tracing supplies indirect lighting, independently of screen-space GI */
  voxelIndirectLight: boolean
  /** optional voxel GI bounce count; the normal default is one */
  voxelIndirectLightBounces?: number
}

type SsgiSettings = Pick<RenderPipelineSettings, | 'screenSpaceIndirectLightAmbientOcclusion'
  | 'screenSpaceIndirectLightBackfaceLighting'
  | 'screenSpaceIndirectLightExpFactor'
  | 'screenSpaceIndirectLightIntensity'
  | 'screenSpaceIndirectLightRadius'
  | 'screenSpaceIndirectLightSlices'
  | 'screenSpaceIndirectLightSteps'
  | 'screenSpaceIndirectLightTemporalFiltering'
  | 'screenSpaceIndirectLightThickness'>

/** Read the `?graphics` name: fast, heavy or cinematic. Anything else is fast. */
export function readGraphicsModeName(input: URL | string = typeof location === 'undefined' ? '' : location.href) {
  return readPermalink(input, {schema: graphicsModeSchema}).graphics
}

/** Read whether `?graphics` asks for heavy graphics, which cinematic graphics are too. */
export function readGraphicsMode(input?: URL | string) {
  return readGraphicsModeName(input) !== useGraphicsMode.getName(false)
}

/** Read whether `?graphics` asks for cinematic graphics: heavy, but budgeted for non-realtime rendering. */
export function readCinematicGraphics(input?: URL | string) {
  return readGraphicsModeName(input) === useGraphicsMode.getName(true, true)
}

const fastProfile: GraphicsProfile = {
  canvasTextureMipmaps: false,
  canvasTextureResolution: 0.5,
  noiseTextures: false,
  floorReflections: false,
  indirectLight: false,
  shadows: false,
  postprocessing: false,
  ambientOcclusionResolutionScale: 0.75,
  ambientOcclusionSamples: 16,
  reflectionResolutionScale: 1,
  shadowMapScale: 1,
  shadowSamples: 5,
  surfaceAnisotropy: 8,
  volumetricLight: false,
  volumetricLightSteps: 64,
  voxelIndirectLight: false,
}
const heavyProfile: GraphicsProfile = {
  canvasTextureMipmaps: false,
  canvasTextureResolution: 1,
  noiseTextures: true,
  floorReflections: true,
  indirectLight: false,
  shadows: true,
  postprocessing: true,
  ambientOcclusionResolutionScale: 0.75,
  ambientOcclusionSamples: 16,
  reflectionResolutionScale: 1,
  shadowMapScale: 1,
  shadowSamples: 4,
  sunShadowRadius: 4,
  sunShadowSamples: 4,
  surfaceAnisotropy: 8,
  volumetricLight: true,
  volumetricLightSteps: 64,
  voxelIndirectLight: true,
}
// Cinematic raises intermediate and shadow-map resolutions, AO quality, texture filtering and indirect light for non-realtime rendering.
const cinematicProfile: GraphicsProfile = {
  ...heavyProfile,
  canvasTextureMipmaps: true,
  canvasTextureResolution: 2,
  indirectLight: true,
  ambientOcclusionRadius: 1,
  ambientOcclusionResolutionScale: 2,
  ambientOcclusionSamples: 64,
  ambientOcclusionScale: 0.8,
  ambientOcclusionThickness: 2,
  reflectionResolutionScale: 2,
  shadowMapScale: 4,
  shadowSamples: 16,
  sunShadowMapSize: 8192,
  sunShadowRadius: 8,
  sunShadowSamples: 16,
  ssgi: {
    screenSpaceIndirectLightAmbientOcclusion: 0.5,
    screenSpaceIndirectLightBackfaceLighting: 0.2,
    screenSpaceIndirectLightExpFactor: 2,
    screenSpaceIndirectLightIntensity: 5,
    screenSpaceIndirectLightRadius: 32,
    screenSpaceIndirectLightSlices: 4,
    screenSpaceIndirectLightSteps: 32,
    screenSpaceIndirectLightTemporalFiltering: true,
    screenSpaceIndirectLightThickness: 1,
  },
  surfaceAnisotropy: 16,
  volumetricLightSteps: 128,
  voxelIndirectLightBounces: 2,
}
/** WebGPU’s default texture size limit, which Three requests whatever the adapter supports */
const maxTextureSize = 8192
/** Cinematic requests room for optional 16K shadow-map experiments; the default sun map is 8K. */
export const cinematicMaxTextureSize = 16_384

/** Caps a canvas texture’s resolution so its backing store stays within the texture size limit, which a large atlas would exceed at the cinematic resolution. */
export function fitCanvasTextureResolution(resolution: number, width: number, height: number) {
  return Math.min(resolution, maxTextureSize / Math.max(width, height))
}

/** Select a stable gallery-specific budget without exposing enum keys to consumers. */
export function getGraphicsProfile(isHeavy: boolean, isCinematic = false) {
  if (!isHeavy) {
    return fastProfile
  }
  return isCinematic ? cinematicProfile : heavyProfile
}

/** Resolve the sun’s independent shadow-map dimensions, PCF width and sample budget. */
export function getSunShadowSettings(profile: GraphicsProfile, baseMapSize: number) {
  return {
    mapSize: profile.sunShadowMapSize ?? baseMapSize * profile.shadowMapScale,
    radius: profile.sunShadowRadius ?? profile.shadowMapScale,
    samples: profile.sunShadowSamples ?? profile.shadowSamples,
  }
}

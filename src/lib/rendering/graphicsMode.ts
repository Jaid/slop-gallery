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

type GraphicsProfile = {
  /** ambient occlusion pixels per output pixel along each axis */
  ambientOcclusionResolutionScale: number
  /** ambient occlusion samples per pixel */
  ambientOcclusionSamples: number
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
  /** anisotropic filtering of the repeating procedural surfaces like plaster, stone and wood */
  surfaceAnisotropy: number
}

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
  shadowSamples: 5,
  surfaceAnisotropy: 8,
}
// Heavy at twice the resolution of every intermediate map and four times the shadow map resolution, with more samples, full texture filtering and indirect light, for renders that don’t have to keep up with the display.
const cinematicProfile: GraphicsProfile = {
  ...heavyProfile,
  canvasTextureMipmaps: true,
  canvasTextureResolution: 2,
  indirectLight: true,
  ambientOcclusionResolutionScale: 1.5,
  ambientOcclusionSamples: 32,
  reflectionResolutionScale: 2,
  shadowMapScale: 4,
  shadowSamples: 16,
  surfaceAnisotropy: 16,
}
/** WebGPU’s default texture size limit, which Three requests whatever the adapter supports */
const maxTextureSize = 8192
/** the texture size limit cinematic graphics request instead, for the sun’s shadow map at four times its heavy size; desktop GPUs support it */
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

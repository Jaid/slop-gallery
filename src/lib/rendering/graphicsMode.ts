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
  /** backing pixels per logical texel for runtime canvas textures such as signs */
  canvasTextureResolution: number
  floorReflections: boolean
  noiseTextures: boolean
  postprocessing: boolean
  /** floor reflection pixels per output pixel along each axis */
  reflectionResolutionScale: number
  /** factor on every shadow map’s size along each axis */
  shadowMapScale: number
  shadows: boolean
  /** shadow map lookups per pixel and light */
  shadowSamples: number
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
  canvasTextureResolution: 0.5,
  noiseTextures: false,
  floorReflections: false,
  shadows: false,
  postprocessing: false,
  ambientOcclusionResolutionScale: 0.75,
  ambientOcclusionSamples: 16,
  reflectionResolutionScale: 1,
  shadowMapScale: 1,
  shadowSamples: 5,
}
const heavyProfile: GraphicsProfile = {
  canvasTextureResolution: 1,
  noiseTextures: true,
  floorReflections: true,
  shadows: true,
  postprocessing: true,
  ambientOcclusionResolutionScale: 0.75,
  ambientOcclusionSamples: 16,
  reflectionResolutionScale: 1,
  shadowMapScale: 1,
  shadowSamples: 5,
}
// Heavy at twice the resolution of every intermediate map and with more samples, for renders that don’t have to keep up with the display.
const cinematicProfile: GraphicsProfile = {
  ...heavyProfile,
  canvasTextureResolution: 2,
  ambientOcclusionResolutionScale: 1.5,
  ambientOcclusionSamples: 32,
  reflectionResolutionScale: 2,
  shadowMapScale: 2,
  shadowSamples: 16,
}

/** Select a stable gallery-specific budget without exposing enum keys to consumers. */
export function getGraphicsProfile(isHeavy: boolean, isCinematic = false) {
  if (!isHeavy) {
    return fastProfile
  }
  return isCinematic ? cinematicProfile : heavyProfile
}

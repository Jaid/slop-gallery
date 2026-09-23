import optis from 'optis'
import readPermalink from 'read-permalink'
import useGraphicsQuality from 'use-graphics-quality'

const normalizeGraphicsQuality = (value: unknown) => {
  if (value === true || value === useGraphicsQuality.getName(true)) {
    return true
  }
  if (value === false || value === useGraphicsQuality.getName(false)) {
    return false
  }
  return false
}

const graphicsQualitySchema = optis({
  defaults: {
    graphics: false,
  },
  normalizations: {
    graphics: normalizeGraphicsQuality,
  },
})

export function readGraphicsQuality(input: string | URL = typeof location === 'undefined' ? '' : location.href) {
  return readPermalink(input, {schema: graphicsQualitySchema}).graphics
}

type GraphicsProfile = {
  dpr: number
  floorReflections: boolean
  noiseTextures: boolean
  postprocessing: boolean
  shadows: boolean
}

const performanceProfile: GraphicsProfile = {
  dpr: 1,
  noiseTextures: false,
  floorReflections: false,
  shadows: false,
  postprocessing: false,
}
const qualityProfile: GraphicsProfile = {
  get dpr() {
    const deviceDpr: unknown = Reflect.get(globalThis, 'devicePixelRatio')
    return typeof deviceDpr === 'number' ? deviceDpr : 1
  },
  noiseTextures: true,
  floorReflections: true,
  shadows: true,
  postprocessing: true,
}

/** Select a stable gallery-specific budget without exposing enum keys to consumers. */
export function getGraphicsProfile(isQuality: boolean) {
  return isQuality ? qualityProfile : performanceProfile
}

import {createParser} from 'nuqs'
import useGraphicsQuality from 'use-graphics-quality'

/** Keep names at the URL boundary; all application state is boolean. */
export const graphicsQualityParser = createParser({
  parse(value) {
    if (value === useGraphicsQuality.getName(true)) {
      return true
    }
    if (value === useGraphicsQuality.getName(false)) {
      return false
    }
    return null
  },
  serialize: useGraphicsQuality.getName,
}).withDefault(false)

type GraphicsProfile = {
  dpr: [number, number] | number
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
  dpr: [1, 2],
  noiseTextures: true,
  floorReflections: true,
  shadows: true,
  postprocessing: true,
}

/** Select a stable gallery-specific budget without exposing enum keys to consumers. */
export function getGraphicsProfile(isQuality: boolean) {
  return isQuality ? qualityProfile : performanceProfile
}

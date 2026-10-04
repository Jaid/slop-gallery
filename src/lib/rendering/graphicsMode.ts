import optis from 'optis'
import readPermalink from 'read-permalink'
import useGraphicsMode from 'use-graphics-mode'

const normalizeGraphicsMode = (value: unknown) => {
  if (value === true || value === useGraphicsMode.getName(true)) {
    return true
  }
  if (value === false || value === useGraphicsMode.getName(false)) {
    return false
  }
  return false
}
const graphicsModeSchema = optis({
  defaults: {
    graphics: false,
  },
  normalizations: {
    graphics: normalizeGraphicsMode,
  },
})

type GraphicsProfile = {
  dpr: number
  floorReflections: boolean
  noiseTextures: boolean
  postprocessing: boolean
  shadows: boolean
}

export function readGraphicsMode(input: URL | string = typeof location === 'undefined' ? '' : location.href) {
  return readPermalink(input, {schema: graphicsModeSchema}).graphics
}

const fastProfile: GraphicsProfile = {
  dpr: 1,
  noiseTextures: false,
  floorReflections: false,
  shadows: false,
  postprocessing: false,
}
const heavyProfile: GraphicsProfile = {
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
export function getGraphicsProfile(isHeavy: boolean) {
  return isHeavy ? heavyProfile : fastProfile
}

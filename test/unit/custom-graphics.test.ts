import {expect, test} from 'bun:test'

import {getDefaultCustomGraphics, getTunedGraphics, toggleGraphicsTuning, useCustomGraphics, useGraphicsTuning} from '../../src/lib/rendering/customGraphics.ts'
import {getGraphicsProfile} from '../../src/lib/rendering/graphicsMode.ts'

test('the tuning panel starts from the pipeline of the page’s heavy graphics', () => {
  const profile = getGraphicsProfile(true)
  expect(getDefaultCustomGraphics()).toMatchObject({
    ambientOcclusionResolutionScale: profile.ambientOcclusionResolutionScale,
    ambientOcclusionSamples: profile.ambientOcclusionSamples,
    antiAliasing: 'traa',
    contactShadows: false,
    dither: profile.volumetricLight,
    reflectionResolutionScale: profile.reflectionResolutionScale,
    screenSpaceIndirectLight: profile.indirectLight,
    volumetricLight: profile.volumetricLight,
    voxelIndirectLight: profile.indirectLight,
  })
})
test('the pipeline follows the panel only while it shows', () => {
  const defaults = getDefaultCustomGraphics()
  useCustomGraphics.setState({vignette: 0.5})
  expect(getTunedGraphics()).toEqual(defaults)
  toggleGraphicsTuning()
  expect(useGraphicsTuning.getState().open).toBe(true)
  expect(getTunedGraphics().vignette).toBe(0.5)
  toggleGraphicsTuning()
  expect(getTunedGraphics()).toEqual(defaults)
  useCustomGraphics.setState(defaults, true)
})

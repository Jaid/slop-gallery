import {expect, test} from 'bun:test'

import {renderToStaticMarkup} from 'react-dom/server'
import useGraphicsMode, {useGraphicsModeValue} from 'use-graphics-mode'

import GraphicsMode from '../../src/components/App/GraphicsMode.tsx'
import {fitCanvasTextureResolution, getGraphicsProfile, readCinematicGraphics, readGraphicsMode, readGraphicsModeName} from '../../src/lib/rendering/graphicsMode.ts'
import {getRenderPipelineSettings} from '../../src/lib/rendering/renderPipelineSettings.ts'

function ReadProfile() {
  const isHeavy: boolean = useGraphicsMode()
  const profile = useGraphicsModeValue(getGraphicsProfile)
  return <span>{String(isHeavy)}:{JSON.stringify(profile)}</span>
}
test('graphics URL names round-trip through boolean state and default to fast', () => {
  expect(readGraphicsMode()).toBe(false)
  for (const isHeavy of [true, false]) {
    const name = useGraphicsMode.getName(isHeavy)
    expect(readGraphicsMode(`?graphics=${name}`)).toBe(isHeavy)
  }
  for (const value of ['', 'lite', 'full', 'auto', 'high', 'quality', 'performance', 'QUALITY', 'true', 'false', 'Cinematic']) {
    expect(readGraphicsMode(`?graphics=${value}`)).toBe(false)
    expect(readCinematicGraphics(`?graphics=${value}`)).toBe(false)
    expect(readGraphicsModeName(`?graphics=${value}`)).toBe('fast')
  }
})
test('cinematic graphics read as heavy, and only cinematic reads as cinematic', () => {
  expect(readGraphicsModeName('?graphics=cinematic')).toBe('cinematic')
  expect(readGraphicsMode('?graphics=cinematic')).toBe(true)
  expect(readCinematicGraphics('?graphics=cinematic')).toBe(true)
  expect(readCinematicGraphics('?graphics=heavy')).toBe(false)
  expect(readCinematicGraphics()).toBe(false)
})
test('the cinematic profile is heavy with every intermediate map at twice the resolution, shadow maps at four times, more samples, full texture filtering and indirect light', () => {
  const heavy = getGraphicsProfile(true)
  const cinematic = getGraphicsProfile(true, true)
  expect(cinematic).toEqual({
    ...heavy,
    canvasTextureMipmaps: true,
    canvasTextureResolution: 2,
    indirectLight: true,
    ambientOcclusionResolutionScale: 1.5,
    ambientOcclusionSamples: 32,
    reflectionResolutionScale: 2,
    shadowMapScale: 4,
    shadowSamples: 16,
    surfaceAnisotropy: 16,
    volumetricLightSteps: 128,
  })
  expect(getGraphicsProfile(true, true)).toBe(cinematic)
  expect(getGraphicsProfile(false, true)).toBe(getGraphicsProfile(false))
})
test('the provider exposes the default scene budget during SSR', () => {
  const html = renderToStaticMarkup(<GraphicsMode><ReadProfile /></GraphicsMode>)
  expect(html).toStartWith('<span>false:')
  expect(html).toContain('postprocessing&quot;:false')
  expect(getGraphicsProfile(false)).toEqual({
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
  })
  expect(getGraphicsProfile(true)).toEqual({
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
    volumetricLight: true,
    volumetricLightSteps: 64,
  })
  expect(getGraphicsProfile(true)).toBe(getGraphicsProfile(true))
  expect(getGraphicsProfile(false)).toBe(getGraphicsProfile(false))
})
test('heavy and cinematic share the tuned volumetric sunlight values, apart from cinematic raymarch steps', () => {
  const heavy = getRenderPipelineSettings(getGraphicsProfile(true), 'traa')
  const cinematic = getRenderPipelineSettings(getGraphicsProfile(true, true), 'traa')
  const volumetric = {
    volumetricLight: true,
    volumetricLightBlur: 0,
    volumetricLightDensity: 20,
    volumetricLightDistanceAttenuation: 2.5,
    volumetricLightMaxDensity: 1,
    volumetricLightResolutionScale: 0.25,
  }
  expect(heavy).toMatchObject({
    ...volumetric,
    volumetricLightSteps: 64,
  })
  expect(cinematic).toMatchObject({
    ...volumetric,
    volumetricLightSteps: 128,
  })
})
test('Fast disables bloom, while Heavy and Cinematic use the current tuned bloom defaults', () => {
  const fast = getRenderPipelineSettings(getGraphicsProfile(false), false)
  const heavy = getRenderPipelineSettings(getGraphicsProfile(true), 'traa')
  const cinematic = getRenderPipelineSettings(getGraphicsProfile(true, true), 'traa')
  const tunedBloom = {
    bloom: true,
    bloomLuminanceCap: 4,
    bloomRadius: 0.3,
    bloomSmoothWidth: 0.5,
    bloomStrength: 1,
    bloomThreshold: 2,
  }
  expect(fast.bloom).toBe(false)
  expect(heavy).toMatchObject(tunedBloom)
  expect(cinematic).toMatchObject(tunedBloom)
})
test('canvas texture resolutions stay within the texture size limit', () => {
  expect(fitCanvasTextureResolution(2, 1024, 246)).toBe(2)
  expect(fitCanvasTextureResolution(2, 7200, 3840) * 7200).toBe(8192)
  expect(fitCanvasTextureResolution(0.5, 7200, 3840)).toBe(0.5)
})

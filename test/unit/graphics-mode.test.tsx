import {expect, test} from 'bun:test'

import {renderToStaticMarkup} from 'react-dom/server'
import useGraphicsMode, {useGraphicsModeValue} from 'use-graphics-mode'

import GraphicsMode from '../../src/components/App/GraphicsMode.tsx'
import {getGraphicsProfile, readCinematicGraphics, readGraphicsMode, readGraphicsModeName} from '../../src/lib/rendering/graphicsMode.ts'

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
test('the cinematic profile is heavy with every intermediate map at twice the resolution, more samples and full texture filtering', () => {
  const heavy = getGraphicsProfile(true)
  const cinematic = getGraphicsProfile(true, true)
  expect(cinematic).toEqual({
    ...heavy,
    canvasTextureMipmaps: true,
    canvasTextureResolution: 2,
    ambientOcclusionResolutionScale: 1.5,
    ambientOcclusionSamples: 32,
    reflectionResolutionScale: 2,
    shadowMapScale: 2,
    shadowSamples: 16,
    surfaceAnisotropy: 16,
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
    shadows: false,
    postprocessing: false,
    ambientOcclusionResolutionScale: 0.75,
    ambientOcclusionSamples: 16,
    reflectionResolutionScale: 1,
    shadowMapScale: 1,
    shadowSamples: 5,
    surfaceAnisotropy: 8,
  })
  expect(getGraphicsProfile(true)).toEqual({
    canvasTextureMipmaps: false,
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
    surfaceAnisotropy: 8,
  })
  expect(getGraphicsProfile(true)).toBe(getGraphicsProfile(true))
  expect(getGraphicsProfile(false)).toBe(getGraphicsProfile(false))
})

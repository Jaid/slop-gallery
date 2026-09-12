import {expect, test} from 'bun:test'

import {NuqsTestingAdapter} from 'nuqs/adapters/testing'
import {renderToStaticMarkup} from 'react-dom/server'
import useGraphicsQuality, {useGraphicsQualityValue} from 'use-graphics-quality'

import GraphicsQuality from '../../src/components/App/GraphicsQuality.tsx'
import parameterParsers from '../../src/lib/ai/settings.ts'
import {getGraphicsProfile, graphicsQualityParser} from '../../src/lib/rendering/graphicsQuality.ts'

function ReadProfile() {
  const isQuality: boolean = useGraphicsQuality()
  const profile = useGraphicsQualityValue(getGraphicsProfile)
  return <span>{String(isQuality)}:{JSON.stringify(profile)}</span>
}
test('graphics URL names round-trip through boolean state and default to performance', () => {
  expect(graphicsQualityParser.defaultValue).toBe(false)
  for (const isQuality of [true, false]) {
    const name = graphicsQualityParser.serialize(isQuality)
    expect(name).toBe(useGraphicsQuality.getName(isQuality))
    expect(graphicsQualityParser.parse(name)).toBe(isQuality)
  }
  for (const value of ['', 'lite', 'full', 'auto', 'high', 'QUALITY', 'true', 'false']) {
    expect(graphicsQualityParser.parse(value)).toBeNull()
  }
  expect(parameterParsers).not.toHaveProperty('lite')
  expect(parameterParsers).not.toHaveProperty('graphics')
})
test('the URL-backed provider exposes isQuality and selects the scene budget', () => {
  for (const [query, isQuality] of [['', false], ['?graphics=quality', true], ['?graphics=performance', false], ['?graphics=invalid', false], ['?lite=true', false]] as const) {
    const html = renderToStaticMarkup(<NuqsTestingAdapter searchParams={query}><GraphicsQuality><ReadProfile/></GraphicsQuality></NuqsTestingAdapter>)
    expect(html).toStartWith(`<span>${String(isQuality)}:`)
    expect(html).toContain(isQuality ? '[1,2]' : 'dpr&quot;:1')
    expect(html).toContain(isQuality ? 'postprocessing&quot;:true' : 'postprocessing&quot;:false')
  }
  expect(getGraphicsProfile(false)).toEqual({
    dpr: 1,
    noiseTextures: false,
    floorReflections: false,
    shadows: false,
    postprocessing: false,
  })
  expect(getGraphicsProfile(true)).toEqual({
    dpr: [1, 2],
    noiseTextures: true,
    floorReflections: true,
    shadows: true,
    postprocessing: true,
  })
  expect(getGraphicsProfile(true)).toBe(getGraphicsProfile(true))
  expect(getGraphicsProfile(false)).toBe(getGraphicsProfile(false))
})

import {expect, test} from 'bun:test'

import {renderToStaticMarkup} from 'react-dom/server'
import useGraphicsQuality, {useGraphicsQualityValue} from 'use-graphics-quality'

import GraphicsQuality from '../../src/components/App/GraphicsQuality.tsx'
import {getGraphicsProfile, readGraphicsQuality} from '../../src/lib/rendering/graphicsQuality.ts'

function ReadProfile() {
  const isQuality: boolean = useGraphicsQuality()
  const profile = useGraphicsQualityValue(getGraphicsProfile)
  return <span>{String(isQuality)}:{JSON.stringify(profile)}</span>
}

test('graphics URL names round-trip through boolean state and default to performance', () => {
  expect(readGraphicsQuality()).toBe(false)
  for (const isQuality of [true, false]) {
    const name = useGraphicsQuality.getName(isQuality)
    expect(readGraphicsQuality(`?graphics=${name}`)).toBe(isQuality)
  }
  for (const value of ['', 'lite', 'full', 'auto', 'high', 'QUALITY', 'true', 'false']) {
    expect(readGraphicsQuality(`?graphics=${value}`)).toBe(false)
  }
})

test('the provider exposes the default scene budget during SSR', () => {
  const html = renderToStaticMarkup(<GraphicsQuality><ReadProfile /></GraphicsQuality>)
  expect(html).toStartWith('<span>false:')
  expect(html).toContain('postprocessing&quot;:false')
  expect(getGraphicsProfile(false)).toEqual({
    dpr: 1,
    noiseTextures: false,
    floorReflections: false,
    shadows: false,
    postprocessing: false,
  })
  expect(getGraphicsProfile(true)).toEqual({
    dpr: 1,
    noiseTextures: true,
    floorReflections: true,
    shadows: true,
    postprocessing: true,
  })
  expect(getGraphicsProfile(true)).toBe(getGraphicsProfile(true))
  expect(getGraphicsProfile(false)).toBe(getGraphicsProfile(false))
})

test('DPR is fixed at 1 for performance and follows the device in quality', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'devicePixelRatio')
  try {
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      configurable: true,
      value: 1.75,
    })
    expect(getGraphicsProfile(false).dpr).toBe(1)
    expect(getGraphicsProfile(true).dpr).toBe(1.75)
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, 'devicePixelRatio', descriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'devicePixelRatio')
    }
  }
})

import {expect, test} from 'bun:test'

import {renderToStaticMarkup} from 'react-dom/server'
import useGraphicsMode, {useGraphicsModeValue} from 'use-graphics-mode'

import GraphicsMode from '../../src/components/App/GraphicsMode.tsx'
import {getGraphicsProfile, readGraphicsMode} from '../../src/lib/rendering/graphicsMode.ts'

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
  for (const value of ['', 'lite', 'full', 'auto', 'high', 'quality', 'performance', 'QUALITY', 'true', 'false']) {
    expect(readGraphicsMode(`?graphics=${value}`)).toBe(false)
  }
})
test('the provider exposes the default scene budget during SSR', () => {
  const html = renderToStaticMarkup(<GraphicsMode><ReadProfile /></GraphicsMode>)
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
test('DPR is fixed at 1 in fast mode and follows the device in heavy mode', () => {
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

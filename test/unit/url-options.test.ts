import {describe, expect, test} from 'bun:test'

import {readIntroNarration} from '../../src/lib/audio/intro.ts'
import {readDevelopmentMode} from '../../src/lib/developmentMode.ts'
import {getAntiAliasing, readAntiAliasing} from '../../src/lib/rendering/antiAliasing.ts'
import {readNear} from '../../src/lib/rendering/near.ts'
import {readScale} from '../../src/lib/rendering/scale.ts'
import {readVisionMode} from '../../src/lib/rendering/visionMode.ts'

describe('URL options', () => {
  test('?development is enabled by a bare or true flag only', () => {
    expect(readDevelopmentMode('?development')).toBe(true)
    expect(readDevelopmentMode('?development=true')).toBe(true)
    for (const search of ['', '?development=false', '?development=1', '?development=TRUE', '?dev=true']) {
      expect(readDevelopmentMode(search)).toBe(false)
    }
  })
  test('?near and ?scale accept finite positive numbers', () => {
    for (const [value, expected] of [['0.05', 0.05], ['1', 1], ['1.5', 1.5], ['1e-3', 0.001], ['1e1', 10]] as const) {
      expect(readNear(`?near=${value}`)).toBe(expected)
      expect(readScale(`?scale=${value}`)).toBe(expected)
    }
    for (const value of ['', '0', '-0.1', 'auto', 'NaN', 'Infinity']) {
      expect(readNear(`?near=${value}`)).toBeUndefined()
      expect(readScale(`?scale=${value}`)).toBeUndefined()
    }
  })
  test('?vision_mode accepts known modes only', () => {
    expect(readVisionMode('?vision_mode=wireframe')).toBe('wireframe')
    expect(readVisionMode('?vision_mode=portrait_slots')).toBe('portrait_slots')
    for (const search of ['', '?vision_mode=', '?vision_mode=xray', '?vision_mode=Wireframe', '?visionMode=wireframe']) {
      expect(readVisionMode(search)).toBeUndefined()
    }
  })
  test('?anti_aliasing accepts known methods and false only', () => {
    expect(readAntiAliasing('?anti_aliasing=traa')).toBe('traa')
    expect(readAntiAliasing('?anti_aliasing=smaa')).toBe('smaa')
    expect(readAntiAliasing('?anti_aliasing=false')).toBe(false)
    for (const search of ['', '?anti_aliasing=', '?anti_aliasing=TRAA', '?anti_aliasing=msaa', '?anti_aliasing=true', '?antiAliasing=traa']) {
      expect(readAntiAliasing(search)).toBeUndefined()
    }
  })
  test('the graphics mode decides antialiasing unless the URL overrides it', () => {
    expect(getAntiAliasing(true, undefined)).toBe('traa')
    expect(getAntiAliasing(false, undefined)).toBe(false)
    expect(getAntiAliasing(true, false)).toBe(false)
    expect(getAntiAliasing(false, 'smaa')).toBe('smaa')
    expect(getAntiAliasing(false, 'traa')).toBe('traa')
  })
  test('only ?intro_narration=false or 0 skips the welcome narration', () => {
    for (const search of ['https://slop.gallery/?intro_narration=false', '?intro_narration=0', '?ai=false&intro_narration=false']) {
      expect(readIntroNarration(search)).toBe(false)
    }
    for (const search of ['', 'https://slop.gallery/', '?intro_narration=true', '?intro_narration=1', '?intro_narration', '?intro_narration=maybe']) {
      expect(readIntroNarration(search)).toBe(true)
    }
  })
})

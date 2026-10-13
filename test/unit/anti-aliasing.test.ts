import {expect, test} from 'bun:test'

import {getAntiAliasing, readAntiAliasing} from '../../src/lib/rendering/antiAliasing.ts'

test('antialiasing URL values accept known methods and false only', () => {
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

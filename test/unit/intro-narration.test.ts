import {expect, test} from 'bun:test'

import {readIntroNarration} from '../../src/lib/audio/intro.ts'

test('?intro_narration=false skips the welcome narration', () => {
  expect(readIntroNarration('https://slop.gallery/?intro_narration=false')).toBe(false)
  expect(readIntroNarration('?intro_narration=0')).toBe(false)
  expect(readIntroNarration('?ai=false&intro_narration=false')).toBe(false)
})
test('the welcome narration plays without the parameter, when enabled explicitly and for unrecognized values', () => {
  expect(readIntroNarration('')).toBe(true)
  expect(readIntroNarration('https://slop.gallery/')).toBe(true)
  expect(readIntroNarration('?intro_narration=true')).toBe(true)
  expect(readIntroNarration('?intro_narration=1')).toBe(true)
  expect(readIntroNarration('?intro_narration')).toBe(true)
  expect(readIntroNarration('?intro_narration=maybe')).toBe(true)
})

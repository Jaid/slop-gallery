import {expect, test} from 'bun:test'

import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {narrationWords, timingFromCharacters} from 'use-narrator/core'

import NarrationSubtitles from '#component/NarrationSubtitles'

import {easeFill, letterStarts, subtitleGroupAt, subtitleGroups, subtitleWordState} from '../../src/lib/audio/subtitles.ts'

const groupTexts = (text: string) => subtitleGroups(text, narrationWords(text)).map(group => text.slice(group.from, group.to))
test('subtitles show one sentence at a time, and runs of short sentences together', () => {
  expect(groupTexts('An Uninvited Tea Guest. The tea is cold. The guest is shellfish. Nobody is having the afternoon they had imagined.')).toEqual([
    'An Uninvited Tea Guest. The tea is cold.',
    'The guest is shellfish.',
    'Nobody is having the afternoon they had imagined.',
  ])
  expect(groupTexts('His Unbothered Majesty. A ruler of impeccable breeding and absolutely no qualifications.')).toEqual([
    'His Unbothered Majesty.',
    'A ruler of impeccable breeding and absolutely no qualifications.',
  ])
  const groups = subtitleGroups('One. Two.', narrationWords('One. Two.'))
  expect(groups).toEqual([{
    first: 0,
    last: 2,
    from: 0,
    to: 9,
  }])
})
test('before speech the first group shows, after it the last one', () => {
  const text = 'His Unbothered Majesty. A ruler of impeccable breeding and absolutely no qualifications.'
  const groups = subtitleGroups(text, narrationWords(text))
  expect(subtitleGroupAt(groups, -1)).toBe(0)
  expect(subtitleGroupAt(groups, 2)).toBe(0)
  expect(subtitleGroupAt(groups, 3)).toBe(1)
  expect(subtitleGroupAt(groups, 99)).toBe(1)
})
test('a word is current until shortly after its end, then spoken; the end of the narration speaks everything', () => {
  const timing = {words: [{
    from: 0,
    to: 2,
    start: 0,
    end: 0.5,
  }, {
    from: 3,
    to: 5,
    start: 1,
    end: 1.5,
  }]}
  expect(subtitleWordState(0, {
    word: 0,
    progress: 0.5,
    seconds: 0.25,
  }, timing, false)).toBe('current')
  expect(subtitleWordState(0, {
    word: 0,
    progress: 1,
    seconds: 0.55,
  }, timing, false)).toBe('current')
  expect(subtitleWordState(0, {
    word: 0,
    progress: 1,
    seconds: 0.8,
  }, timing, false)).toBe('spoken')
  expect(subtitleWordState(1, {
    word: 0,
    progress: 1,
    seconds: 0.8,
  }, timing, false)).toBe('upcoming')
  expect(subtitleWordState(1, {
    word: 0,
    progress: 1,
    seconds: 0.8,
  }, timing, true)).toBe('spoken')
  // Native speech has no timeline, so its word stays current until the next one starts.
  expect(subtitleWordState(1, {
    word: 1,
    progress: 1,
  }, undefined, false)).toBe('current')
})
test('the word fill is quick at the word’s start and end and slowest in its middle', () => {
  expect(easeFill(-1)).toBe(0)
  expect(easeFill(0)).toBe(0)
  expect(easeFill(0.5)).toBeCloseTo(0.5)
  expect(easeFill(0.1)).toBeGreaterThan(0.1)
  expect(easeFill(0.9)).toBeLessThan(0.9)
  // Slowest in the middle: the same step covers less ground there than near the start.
  expect(easeFill(0.55) - easeFill(0.45)).toBeLessThan(easeFill(0.1) - easeFill(0))
  expect(easeFill(2)).toBe(1)
})
test('letters without a span of their own start with the letter before them or their word', () => {
  const text = 'Hi, “you”'
  const characters = Array.from(text, (character, index) => (/\p{L}/u.test(character) ? [index, index + 0.5] as const : null))
  const starts = letterStarts(timingFromCharacters(text, characters), text.length)!
  expect([...starts]).toEqual([0, 1, 1, 5, 5, 5, 6, 7, 7])
  expect(letterStarts({words: []}, 4)).toBeUndefined()
})
test('subtitles render the current group’s words, letter by letter when the timing has letters', () => {
  const text = 'Hi there. A ruler of impeccable breeding and absolutely no qualifications at all.'
  const narration = {
    instanceId: 'a',
    status: 'before' as const,
    text,
  }
  const plain = renderToStaticMarkup(createElement(NarrationSubtitles, {narration}))
  expect(plain).toContain('data-letters="false"')
  expect(plain).toContain('data-word="1"')
  expect(plain).toContain('data-fill="true">there.</span>')
  expect(plain).not.toContain('ruler')
  const characters = Array.from(text, (_, index) => [index / 10, index / 10 + 0.05] as const)
  const lettered = renderToStaticMarkup(createElement(NarrationSubtitles, {narration: {
    ...narration,
    timing: timingFromCharacters(text, characters),
  }}))
  expect(lettered).toContain('data-letters="true"')
  expect(lettered).toContain('data-letter="3">t</span>')
})

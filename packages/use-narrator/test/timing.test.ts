import {expect, test} from 'bun:test'

import {estimateTiming, narrationCursor, narrationWords, timingFromCharacters, timingFromWords} from '../src/core.ts'

const text = 'His Unbothered Majesty. A ruler of hissing.'
test('words are the whitespace-separated tokens of the text, as character ranges', () => {
  expect(narrationWords('  Hi, “you”  there. ')).toEqual([{
    from: 2,
    to: 5,
  }, {
    from: 6,
    to: 11,
  }, {
    from: 13,
    to: 19,
  }])
})
test('recognized words land on the text’s own words, whatever the recognizer’s spelling, case and punctuation', () => {
  const timing = timingFromWords(text, [
    {
      word: 'his',
      start: 0.1,
      end: 0.3,
    },
    {
      word: 'Unbothered',
      start: 0.4,
      end: 1,
    },
    {
      word: 'majesty,',
      start: 1.1,
      end: 1.8,
    },
    {
      word: 'A',
      start: 2,
      end: 2.1,
    },
    {
      word: 'rule',
      start: 2.2,
      end: 2.5,
    },
    {
      word: 'of',
      start: 2.6,
      end: 2.7,
    },
    {
      word: 'hissing.',
      start: 2.8,
      end: 3.4,
    },
  ])
  expect(timing.characters).toBeUndefined()
  expect(timing.words.map(word => text.slice(word.from, word.to))).toEqual(['His', 'Unbothered', 'Majesty.', 'A', 'ruler', 'of', 'hissing.'])
  expect(timing.words.map(word => word.start)).toEqual([0.1, 0.4, 1.1, 2, 2.2, 2.6, 2.8])
  expect(timing.words[1].end).toBe(1)
  expect(timing.words[6].end).toBeCloseTo(3.4)
})
test('a word split in two or merged with its neighbor keeps the time of its first and last letter', () => {
  const timing = timingFromWords('Unbothered Majesty', [
    {
      word: 'Un',
      start: 0,
      end: 0.2,
    },
    {
      word: 'bothered',
      start: 0.25,
      end: 0.8,
    },
    {
      word: 'majesty',
      start: 0.9,
      end: 1.5,
    },
  ])
  expect(timing.words.map(word => [word.start, word.end])).toEqual([[0, 0.8], [0.9, 1.5]])
  const merged = timingFromWords('of hissing', [{
    word: 'ofhissing',
    start: 1,
    end: 1.9,
  }])
  expect(merged.words[0].start).toBe(1)
  expect(merged.words[1].start).toBeCloseTo(1.2)
  expect(merged.words[1].end).toBeCloseTo(1.9)
})
test('a word the recognizer missed sits between its neighbors instead of breaking the order', () => {
  const timing = timingFromWords('A ruler of hissing', [
    {
      word: 'a',
      start: 0,
      end: 0.1,
    },
    {
      word: 'ruler',
      start: 0.2,
      end: 0.6,
    },
    {
      word: 'hissing',
      start: 1,
      end: 1.6,
    },
  ])
  expect(timing.words[2]).toMatchObject({
    start: 0.6,
    end: 1,
  })
  expect(timing.words.map(word => word.start)).toEqual(timing.words.map(word => word.start).toSorted((a, b) => a - b))
})
test('character spans give letter timings and words from their first and last letter', () => {
  const characters = Array.from('Hi, you.', (character, index) => (/\p{L}/u.test(character) ? [index / 8, index / 8 + 1 / 16] as const : null))
  const timing = timingFromCharacters('Hi, you.', characters)
  expect(timing.characters).toBe(characters)
  expect(timing.words).toEqual([{
    from: 0,
    to: 3,
    start: 0,
    end: 0.1875,
  }, {
    from: 4,
    to: 8,
    start: 0.5,
    end: 0.8125,
  }])
  expect(() => timingFromCharacters('Hi', [null])).toThrow(RangeError)
})
test('the estimate covers the duration in order and leaves room after sentences', () => {
  const timing = estimateTiming(text, 4)
  expect(timing.words[0].start).toBe(0)
  expect(timing.words.at(-1)!.end).toBeCloseTo(4)
  for (const [index, word] of timing.words.entries()) {
    expect(word.end).toBeGreaterThan(word.start)
    expect(word.start).toBeGreaterThanOrEqual(timing.words[index - 1]?.end ?? 0)
  }
  const afterSentence = timing.words[3].start - timing.words[2].end
  const betweenWords = timing.words[2].start - timing.words[1].end
  expect(afterSentence).toBeGreaterThan(betweenWords * 4)
})
test('the cursor follows a timeline through words and pauses, and native speech by character', () => {
  const words = narrationWords(text)
  const timing = timingFromWords(text, [
    {
      word: 'his',
      start: 0.125,
      end: 0.375,
    },
    {
      word: 'unbothered',
      start: 0.5,
      end: 1,
    },
  ])
  expect(timing.words[1]).toMatchObject({
    start: 0.5,
    end: 1,
  })
  expect(narrationCursor(words, undefined, timing)).toEqual({
    word: -1,
    progress: 0,
  })
  expect(narrationCursor(words, {seconds: 0}, timing)).toEqual({
    word: -1,
    progress: 0,
    seconds: 0,
  })
  expect(narrationCursor(words, {seconds: 0.75}, timing)).toEqual({
    word: 1,
    progress: 0.5,
    seconds: 0.75,
  })
  expect(narrationCursor(words, {seconds: 0.4375}, timing)).toMatchObject({
    word: 0,
    progress: 1,
  })
  expect(narrationCursor(words, {character: 5}, timing)).toEqual({
    word: 1,
    progress: 1,
  })
  expect(narrationCursor(words, {character: 0})).toEqual({
    word: 0,
    progress: 1,
  })
})

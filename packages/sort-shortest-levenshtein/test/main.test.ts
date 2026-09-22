import {describe, expect, test} from 'bun:test'

import sortShortestLevenshtein from '../src/main.ts'

describe('sortShortestLevenshtein', () => {
  test('sorts by UTF-8 byte length', () => {
    expect(sortShortestLevenshtein(['é', 'aaa', 'b'])).toEqual(['b', 'é', 'aaa'])
  })
  test('chains equal-byte strings from the last shorter string', () => {
    expect(sortShortestLevenshtein(['zz', 'ac', 'ab', 'a'])).toEqual(['a', 'ac', 'ab', 'zz'])
  })
  test('keeps the first input item as the seed for the shortest byte group', () => {
    expect(sortShortestLevenshtein(['zz', 'aa', 'az'])).toEqual(['zz', 'az', 'aa'])
  })
  test('sorts arbitrary values through a text selector', () => {
    const values = [
      {
        id: 1,
        value: 'bbbb',
      },
      {
        id: 2,
        value: 'a',
      },
      {
        id: 3,
        value: 'aa',
      },
    ]
    expect(sortShortestLevenshtein(values, item => item.value).map(item => item.id)).toEqual([2, 3, 1])
  })
})

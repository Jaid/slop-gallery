import {expect, test} from 'bun:test'

import {narrationWords} from 'use-narrator/core'

import transcriptFor from '../../src/lib/audio/transcript.ts'
import artworks from '../../src/worlds/gallery/artworks.ts'

// Run `bun scripts/alignNarrations.ts` when this fails after a bundled narration or the text it reads changed.
test('every bundled narration has a letter timing for exactly the text it reads', () => {
  const narrated = artworks.filter(artwork => artwork.narration)
  expect(narrated.length).toBeGreaterThan(0)
  for (const artwork of narrated) {
    const text = transcriptFor(artwork)
    const timing = artwork.narration!.timing
    expect(timing, artwork.id).toBeDefined()
    expect(timing!.words.map(({from, to}) => ({
      from,
      to,
    }))).toEqual(narrationWords(text))
    expect(timing!.characters).toHaveLength(text.length)
    for (const [index, span] of timing!.characters!.entries()) {
      expect(span === null, `${artwork.id} character ${index} “${text[index]}”`).toBe(!/['a-z’]/i.test(text[index]))
    }
    for (const [index, word] of timing!.words.entries()) {
      expect(word.end).toBeGreaterThanOrEqual(word.start)
      expect(word.start).toBeGreaterThanOrEqual(timing!.words[index - 1]?.start ?? 0)
    }
  }
})

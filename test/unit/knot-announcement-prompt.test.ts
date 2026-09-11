import {expect, test} from 'bun:test'

import {announcementDurationLimit, announcementInput} from '../../scripts/announceKnots.ts'

test('Knot title prompts contain no model version or letter-reading instructions', () => {
  const input = announcementInput({
    id: 'deepseek/items/astral_orrery',
    text: 'Astral Orrery',
  })
  expect(input).toContain('Calm, wise')
  expect(input).toContain('Read exactly the transcript once, then stop.')
  expect(input).not.toMatch(/model letters|version/iu)
  expect(input).toEndWith('## transcript\nAstral Orrery.')
})
test('only model prompts explain how to read their version, without changing the transcript', () => {
  const input = announcementInput({
    id: 'glm/slug/glm-5.3',
    text: 'GLM 5.3',
  })
  expect(input).toContain('Read model letters and version numbers in English.')
  expect(input).toEndWith('## transcript\nGLM 5.3.')
  expect(announcementInput({
    id: 'x/items/y',
    text: 'Title.',
  })).toEndWith('Title.')
})
test('short titles cannot silently publish suspiciously long announcements', () => {
  expect(announcementDurationLimit({
    id: 'x/items/y',
    text: 'Astral Orrery',
  })).toBe(4)
  expect(announcementDurationLimit({
    id: 'x/slug/y',
    text: 'GLM 5.3',
  })).toBe(8)
  expect(announcementDurationLimit({
    id: 'x/items/y',
    text: 'A longer title with many words',
  })).toBeGreaterThan(7)
})

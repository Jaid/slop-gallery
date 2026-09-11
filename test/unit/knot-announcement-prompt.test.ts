import {expect, test} from 'bun:test'

import {announcementDurationLimit, announcementInput} from '../../scripts/announceKnots.ts'

test('Grok receives only the knot title, not spoken character instructions', () => {
  const input = announcementInput({
    id: 'deepseek/items/astral_orrery',
    text: 'Astral Orrery',
  })
  expect(input).toBe('Astral Orrery')
})
test('model names preserve their letters and version without a Gemini prompt', () => {
  const input = announcementInput({
    id: 'glm/slug/glm-5.3',
    text: 'GLM 5.3',
  })
  expect(input).toBe('GLM 5.3')
  expect(announcementInput({
    id: 'x/items/y',
    text: 'Title.',
  })).toBe('Title')
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
test('removes ending punctuation without changing version numbers or internal punctuation', () => {
  expect(announcementInput({
    id: 'x/slug/y',
    text: 'GPT-6 Astra!  ',
  })).toBe('GPT-6 Astra')
  expect(announcementInput({
    id: 'x/slug/y',
    text: 'GLM 5.3...',
  })).toBe('GLM 5.3')
})

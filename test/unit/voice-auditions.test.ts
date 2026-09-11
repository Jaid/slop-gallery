import {expect, test} from 'bun:test'

import {auditionInput, auditionTranscript, voiceAuditions} from '../../scripts/lib/knots/voiceAuditions.ts'

test('ten distinct audition characters each speak the same four knots and model', () => {
  expect(voiceAuditions).toHaveLength(10)
  expect(new Set(voiceAuditions.map(voice => voice.id)).size).toBe(10)
  expect(new Set(voiceAuditions.map(voice => voice.character)).size).toBe(10)
  expect(auditionTranscript).toHaveLength(5)
  expect(auditionTranscript.at(-1)).toBe('GPT-6 Astra.')
  for (const voice of voiceAuditions) {
    const input = auditionInput(voice.character)
    expect(input).toContain(voice.character)
    expect(input.split('## transcript\n')[1]).toBe(auditionTranscript.join('\n'))
  }
})

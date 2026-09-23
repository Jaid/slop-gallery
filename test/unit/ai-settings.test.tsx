import {expect, test} from 'bun:test'

import {readAiSettings} from '../../src/lib/ai/settings.ts'

test('model and narration preferences remain configurable through URL parameters', () => {
  const searchParams = new URLSearchParams({
    text_model: 'custom-text',
    image_model: 'custom-image',
    audio_model: 'custom-audio',
    text_model_effort: 'high',
    narrator_voice: 'custom-voice',
    narrator_character: 'custom-character',
    eager_audio: 'true',
  }).toString()
  const params = readAiSettings(`?${searchParams}`)
  expect(params).toMatchObject({
    text_model: 'custom-text',
    image_model: 'custom-image',
    audio_model: 'custom-audio',
    text_model_effort: 'high',
    narrator_voice: 'custom-voice',
    narrator_character: 'custom-character',
    eager_audio: true,
  })
})

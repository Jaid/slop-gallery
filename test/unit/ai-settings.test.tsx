import {expect, test} from 'bun:test'

import {renderToStaticMarkup} from 'react-dom/server'
import {GraphicsModeProvider} from 'use-graphics-mode'

import Menu from '#component/Menu'

import {patchAiSettings, readAiSettings} from '../../src/lib/ai/settings.ts'

test('model and narration preferences remain configurable through URL parameters', () => {
  const customSettingsQuery = new URLSearchParams({
    text_model: 'custom-text',
    image_model: 'custom-image',
    audio_model: 'custom-audio',
    text_model_effort: 'high',
    narrator_voice: 'custom-voice',
    narrator_character: 'custom-character',
    eager_audio: 'true',
  })
  const searchParams = customSettingsQuery.toString()
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
test('?ai=false disables AI, while a missing parameter keeps it on', () => {
  expect(readAiSettings('?ai=false').ai).toBe(false)
  expect(readAiSettings('').ai).toBe(true)
})
test('settings changes cannot switch AI back on when the page disabled it', () => {
  const params = readAiSettings('?ai=false')
  expect(patchAiSettings(params, {ai: true}, false).ai).toBe(false)
  expect(patchAiSettings(params, {narrator_voice: 'other'}, false)).toMatchObject({
    ai: false,
    narrator_voice: 'other',
  })
  const enabled = readAiSettings('')
  expect(patchAiSettings(enabled, {ai: false}, true).ai).toBe(false)
  const disabled = {
    ...enabled,
    ai: false,
  }
  expect(patchAiSettings(disabled, {ai: true}, true).ai).toBe(true)
  expect(patchAiSettings(enabled, {eager_audio: true}, true).ai).toBe(true)
})
const renderMenu = (available: boolean) => renderToStaticMarkup(<GraphicsModeProvider isHeavy onChange={() => {}}><Menu available={available} params={readAiSettings(available ? '' : '?ai=false')} setParams={() => {}} /></GraphicsModeProvider>)
test('the menu hides every AI option for ?ai=false', () => {
  const hidden = renderMenu(false)
  expect(hidden).not.toContain('data-testid="connection"')
  expect(hidden).not.toContain('OpenRouter')
  expect(hidden).not.toContain('API key')
  expect(hidden).not.toContain('Enable AI')
  expect(hidden).not.toContain('type="password"')
  expect(hidden).toContain('Mute audio')
  expect(hidden).toContain('Heavy graphics')
  const shown = renderMenu(true)
  expect(shown).toContain('data-testid="connection"')
  expect(shown).toContain('API key')
})

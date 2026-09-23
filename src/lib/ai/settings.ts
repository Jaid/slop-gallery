import optis from 'optis'
import readPermalink, {parseBoolean} from 'read-permalink'

const defaults = {
  ai: true,
  text_model: 'google/gemini-3.8-flash',
  text_model_effort: 'low',
  image_model: 'google/gemini-3.1-flash-lite-image',
  audio_model: 'google/gemini-3.1-flash-tts-preview',
  narrator_voice: 'Algenib',
  narrator_character: 'art gallery narrator – witty, wise, sarcastic, calm',
  eager_audio: false,
}

const normalizeBoolean = (fallback: boolean) => (value: unknown) => {
  try {
    return parseBoolean(value)
  } catch {
    return fallback
  }
}
const normalizeString = (fallback: string) => (value: unknown) => typeof value === 'string' ? value : fallback

export const aiSettingsSchema = optis({
  defaults,
  normalizations: {
    ai: normalizeBoolean(defaults.ai),
    text_model: normalizeString(defaults.text_model),
    text_model_effort: normalizeString(defaults.text_model_effort),
    image_model: normalizeString(defaults.image_model),
    audio_model: normalizeString(defaults.audio_model),
    narrator_voice: normalizeString(defaults.narrator_voice),
    narrator_character: normalizeString(defaults.narrator_character),
    eager_audio: normalizeBoolean(defaults.eager_audio),
  },
})

export function readAiSettings(input: string | URL = typeof location === 'undefined' ? '' : location.href) {
  return readPermalink(input, {schema: aiSettingsSchema})
}

export type AiSettings = ReturnType<typeof readAiSettings>

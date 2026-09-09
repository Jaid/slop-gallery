import {parseAsBoolean, parseAsString} from 'nuqs'

export const parameterParsers = {
  ai: parseAsBoolean.withDefault(true),
  text_model: parseAsString.withDefault('google/gemini-3.8-flash'),
  text_model_effort: parseAsString.withDefault('low'),
  image_model: parseAsString.withDefault('google/gemini-3.1-flash-lite-image'),
  audio_model: parseAsString.withDefault('google/gemini-3.1-flash-tts-preview'),
  narrator_voice: parseAsString.withDefault('Algenib'),
  narrator_character: parseAsString.withDefault('art gallery narrator – witty, wise, sarcastic, calm'),
  eager_audio: parseAsBoolean.withDefault(false),
}
export type AiSettings = {[Key in keyof typeof parameterParsers]: (typeof parameterParsers)[Key]['defaultValue']}

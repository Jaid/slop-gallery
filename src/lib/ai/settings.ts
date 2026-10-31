import optis from 'optis'
import readPermalink, {parseBoolean} from 'read-permalink'

/**
 * OpenRouter’s routing variant for each `ai_tier`, appended to a model ID. `:floor` sorts the model’s endpoints by price and lets flex endpoints compete, `:nitro` sorts them by throughput and lets priority endpoints compete.
 * OpenRouter also accepts `:priority`, but routes it like no variant at all.
 */
const tierVariants = {
  flex: 'floor',
  priority: 'nitro',
} as const
export type AiTier = keyof typeof tierVariants

const defaults = {
  ai: true,
  /** the service tier to ask for; without one, model IDs go out unchanged */
  ai_tier: undefined as AiTier | undefined,
  text_model: 'google/gemini-4-argon',
  text_model_effort: 'low',
  image_model: 'google/gemini-nano-banana-2.1',
  audio_model: 'google/gemini-3.8-flash-tts',
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
const normalizeString = (fallback: string) => (value: unknown) => (typeof value === 'string' ? value : fallback)
const aiSettingsSchema = optis({
  defaults,
  normalizations: {
    ai: normalizeBoolean(defaults.ai),
    ai_tier: (value: unknown): AiTier | undefined => (typeof value === 'string' && Object.hasOwn(tierVariants, value) ? value as AiTier : undefined),
    text_model: normalizeString(defaults.text_model),
    text_model_effort: normalizeString(defaults.text_model_effort),
    image_model: normalizeString(defaults.image_model),
    audio_model: normalizeString(defaults.audio_model),
    narrator_voice: normalizeString(defaults.narrator_voice),
    narrator_character: normalizeString(defaults.narrator_character),
    eager_audio: normalizeBoolean(defaults.eager_audio),
  },
})

export type AiSettings = ReturnType<typeof readAiSettings>

/**
 * The ID to send for `model` at the service tier `tier`, with its routing variant appended, or unchanged without a tier.
 * Only for the chat and speech endpoints: OpenRouter’s image endpoint knows no variants and answers 404 to any.
 */
export function tieredModel(model: string, tier: AiTier | undefined) {
  return tier ? `${model}:${tierVariants[tier]}` : model
}

export function readAiSettings(input: URL | string = typeof location === 'undefined' ? '' : location.href) {
  return readPermalink(input, {schema: aiSettingsSchema})
}

/** Applies a settings change; once the page is opened with `?ai=false`, nothing can switch AI back on. */
export function patchAiSettings(current: AiSettings, patch: Partial<AiSettings>, available: boolean): AiSettings {
  const next = {
    ...current,
    ...patch,
  }
  next.ai = available && next.ai
  return next
}

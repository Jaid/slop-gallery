import type {Provider} from './types.ts'
import type {Parameter, Processed} from 'optis'

import optis from 'optis'

const options = optis({
  defaults: {
    provider: 'auto',
    voice: 'iris',
    language: 'en',
    textNormalization: false,
    timeoutMs: 120_000,
    maxBufferedBytes: 8_000_000,
  },
  requiredKeys: ['key'] as const,
}).extendTyped<{required: {key: string}}>()

export type GrokSpeakerOptions = Omit<Parameter<typeof options>, 'provider'> & {provider?: Provider}
export type Settings = Omit<Processed<typeof options>, 'key' | 'provider'>

export default function resolveOptions(input: GrokSpeakerOptions) {
  const {key, provider, ...settings} = options.process(input)
  if (typeof key !== 'string' || !key || /\s/u.test(key)) {
    throw new TypeError('A nonempty API key without whitespace is required.')
  }
  if (!['auto', 'xai', 'openrouter'].includes(provider)) {
    throw new TypeError('Unknown speech provider.')
  }
  // Never test an unknown credential against multiple providers.
  let detected: Exclude<Provider, 'auto'> | undefined
  if (/^xai-[\d\-a-z_]+$/iu.test(key)) {
    detected = 'xai'
  } else if (/^sk-or-[\d\-a-z_]+$/iu.test(key)) {
    detected = 'openrouter'
  }
  const resolved = provider === 'auto' ? detected : provider
  if (!resolved) {
    throw new TypeError('Cannot infer the provider from this API key. Set provider explicitly.')
  }
  if (detected && resolved !== detected) {
    throw new TypeError('The API key prefix belongs to a different provider.')
  }
  if (![settings.voice, settings.language].every(value => typeof value === 'string' && value.trim())) {
    throw new TypeError('Voice and language must be nonempty strings.')
  }
  if (typeof settings.textNormalization !== 'boolean') {
    throw new TypeError('textNormalization must be a boolean.')
  }
  for (const value of [settings.timeoutMs, settings.maxBufferedBytes]) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 2_147_483_647) {
      throw new RangeError('Timeout and buffer limit must be positive 32-bit integers.')
    }
  }
  return {
    key,
    provider: resolved,
    settings,
  }
}

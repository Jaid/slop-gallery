import {pcmWave} from '../audio/pcmWave.ts'
import ExternalGenerator from './ExternalGenerator.ts'

export default class NarrationGenerator extends ExternalGenerator {
  constructor(key: string, readonly model: string, readonly voice: string) {
    super(key)
  }

  async generate(input: string, {signal, format = this.model.startsWith('google/gemini-') ? 'pcm' : 'mp3', character}: {
    character?: string
    format?: 'mp3' | 'pcm'
    signal?: AbortSignal
  } = {}) {
    const response = await this.request('audio/speech', {
      method: 'POST',
      signal: signal ?? AbortSignal.timeout(90_000),
      body: JSON.stringify({
        model: this.model,
        voice: this.voice,
        input,
        response_format: format,
        ...character ? {
          provider: {
            options: {
              openai: {instructions: character},
              google: {instructions: character},
            },
          },
        } : {},
      }),
    })
    if (!response.ok) {
      throw new Error(`Narration unavailable (${response.status}): ${(await response.text()).slice(0, 2000)}`)
    }
    const type = response.headers.get('content-type') ?? ''
    if (!/^audio\/(?:l16|mp3|mpeg|ogg|pcm|wav|x-wav)(?:;|$)/i.test(type)) {
      throw new Error('The speech provider returned an unsupported audio format.')
    }
    const blob = await response.blob()
    if (!blob.size || blob.size > 25_000_000) {
      throw new Error('The speech provider returned invalid audio.')
    }
    return /audio\/(l16|pcm)/i.test(type) ? pcmWave(await blob.arrayBuffer()) : blob
  }
}

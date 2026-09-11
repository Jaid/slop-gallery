import type {Settings} from '../../options.ts'
import type {GeneratedSpeech, SpeakOptions, SpeechEvent} from '../../types.ts'

import {decodeEnvelope, pcmRate, toWav} from '../../audio.ts'

export default abstract class Provider {
  protected abstract readonly endpoint: string
  abstract readonly id: 'openrouter' | 'xai'
  protected readonly lifetime = new AbortController
  #key: string

  constructor(key: string, protected readonly settings: Settings) {
    this.#key = key
  }

  protected get headers() {
    return {
      Authorization: `Bearer ${this.#key}`,
      'Content-Type': 'application/json',
    }
  }

  protected get synthesisOptions() {
    return {
      language: this.settings.language,
      output_format: {
        codec: 'pcm',
        sample_rate: 48_000,
      },
      optimize_streaming_latency: 0,
      text_normalization: this.settings.textNormalization,
    }
  }

  protected abstract body(text: string, timestamps: boolean): object

  close() {
    this.lifetime.abort(new Error('GrokSpeaker is closed.'))
  }
  async generate(text: string, {signal, timestamps = true}: SpeakOptions): Promise<GeneratedSpeech> {
    const response = await this.request(text, timestamps, this.signal(signal))
    try {
      const traceId = response.headers.get(this.id === 'xai' ? 'x-trace-id' : 'x-generation-id') ?? undefined
      if (timestamps) {
        return decodeEnvelope(await response.json(), traceId)
      }
      const sampleRate = pcmRate(response.headers.get('content-type'), this.id === 'xai' ? 48_000 : undefined)
      return toWav(new Uint8Array(await response.arrayBuffer()), sampleRate, [], traceId)
    } finally {
      await response.body?.cancel().catch(() => {})
    }
  }
  protected async request(text: string, timestamps: boolean, signal: AbortSignal) {
    signal.throwIfAborted()
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(this.body(text, timestamps)),
      signal,
      redirect: 'error',
    })
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(`${this.id} speech request failed (HTTP ${response.status}).`)
    }
    return response
  }

  protected signal(signal?: AbortSignal) {
    return AbortSignal.any([this.lifetime.signal, AbortSignal.timeout(this.settings.timeoutMs), ...signal ? [signal] : []])
  }

  abstract stream(text: string, options: SpeakOptions): AsyncGenerator<SpeechEvent, void>

  abstract warmup(): Promise<void>
}

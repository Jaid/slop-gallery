import type {SpeakOptions, SpeechEvent} from '../types.ts'

import {pcmRate} from '../audio.ts'
import Provider from './base/Provider.ts'

export default class OpenRouter extends Provider {
  protected readonly endpoint = 'https://openrouter.ai/api/v1/audio/speech'
  readonly id = 'openrouter'

  protected body(text: string, timestamps: boolean) {
    return {
      model: 'x-ai/grok-voice-tts-1.0',
      voice: this.settings.voice,
      input: text,
      response_format: 'pcm',
      provider: {
        options: {
          xai: {
            ...this.synthesisOptions,
            with_timestamps: timestamps,
          },
        },
      },
    }
  }

  async *stream(text: string, {signal, timestamps = false}: SpeakOptions): AsyncGenerator<SpeechEvent, void> {
    if (timestamps) {
      throw new Error('OpenRouter timestamps require buffered generation. Use generate() or stream with provider xai.')
    }
    const controller = new AbortController
    const combined = AbortSignal.any([this.signal(signal), controller.signal])
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    try {
      const response = await this.request(text, false, combined)
      const sampleRate = pcmRate(response.headers.get('content-type'))
      if (!response.body) {
        throw new Error('Missing PCM response body.')
      }
      reader = response.body.getReader()
      let remainder: Uint8Array = new Uint8Array
      let received = false
      while (true) {
        combined.throwIfAborted()
        const {value, done} = await reader.read()
        combined.throwIfAborted()
        if (done) {
          break
        }
        const bytes = remainder.length ? Buffer.concat([remainder, value]) : value
        const length = bytes.byteLength - bytes.byteLength % 2
        remainder = Uint8Array.from(bytes.subarray(length))
        if (length) {
          received = true
          yield {
            type: 'audio',
            pcm: bytes.subarray(0, length),
            sampleRate,
          }
        }
      }
      if (remainder.length || !received) {
        throw new Error('Empty or truncated 16-bit PCM stream.')
      }
      yield {
        type: 'done',
        traceId: response.headers.get('x-generation-id') ?? undefined,
      }
    } finally {
      controller.abort()
      await reader?.cancel().catch(() => {})
      reader?.releaseLock()
    }
  }

  async warmup() {
    this.lifetime.signal.throwIfAborted()
    // Establish HTTP keep-alive and validate authentication without a synthesis charge.
    // OpenRouter does not expose xAI’s reusable TTS socket.
    const response = await fetch('https://openrouter.ai/api/v1/key', {
      headers: this.headers,
      signal: this.signal(),
      redirect: 'error',
    })
    await response.arrayBuffer()
    if (!response.ok) {
      throw new Error(`OpenRouter warmup failed (HTTP ${response.status}).`)
    }
  }
}

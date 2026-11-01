import type {NarrationTiming, RecognizedWord} from 'use-narrator/core'

import {timingFromWords} from 'use-narrator/core'

import ExternalGenerator from './ExternalGenerator.ts'

const formats: Record<string, string> = {
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/flac': 'flac',
}

/** Times a narration’s words in its generated audio by speech-to-text with word timestamps, then maps them onto the narration’s own text. */
export default class NarrationAligner extends ExternalGenerator {
  constructor(key: string, readonly model: string) {
    super(key)
  }

  async align(audio: Blob, text: string, {signal}: {signal?: AbortSignal} = {}): Promise<NarrationTiming> {
    const format = formats[audio.type.split(';')[0].trim().toLowerCase()]
    if (!format) {
      throw new Error(`Narration audio of type ${audio.type || 'unknown'} cannot be aligned.`)
    }
    const bytes = await audio.bytes()
    const response = await this.request('audio/transcriptions', {
      method: 'POST',
      signal: signal ?? AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: this.model,
        input_audio: {
          data: bytes.toBase64(),
          format,
        },
        language: 'en',
        temperature: 0,
        response_format: 'verbose_json',
        timestamp_granularities: ['word'],
      }),
    })
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Narration alignment unavailable (${response.status}): ${error.slice(0, 2000)}`)
    }
    const {words} = await response.json() as {words?: Array<Partial<RecognizedWord>>}
    const recognized = (words ?? []).filter((word): word is RecognizedWord => typeof word.word === 'string' && Number.isFinite(word.start) && Number.isFinite(word.end))
    if (!recognized.length) {
      throw new Error(`${this.model} returned no word timestamps.`)
    }
    return timingFromWords(text, recognized)
  }
}

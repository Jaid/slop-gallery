import type {GrokSpeakerOptions} from './options.ts'
import type {SpeakOptions, Text} from './types.ts'

import resolveOptions from './options.ts'
import OpenRouter from './providers/OpenRouter.ts'
import Xai from './providers/Xai.ts'
import serializeText from './serializeText.ts'

/** Server-side Bun client. Never ship an API key to the browser. */
export default class GrokSpeaker {
  #transport: OpenRouter | Xai

  constructor(options: GrokSpeakerOptions) {
    const {key, provider, settings} = resolveOptions(options)
    this.#transport = provider === 'xai' ? new Xai(key, settings) : new OpenRouter(key, settings)
  }

  get provider() {
    return this.#transport.id
  }

  close() {
    this.#transport.close()
  }

  generate(text: Text, options: SpeakOptions = {}) {
    return this.#transport.generate(serializeText(text), options)
  }

  stream(text: Text, options: SpeakOptions = {}) {
    return this.#transport.stream(serializeText(text), options)
  }

  [Symbol.dispose]() {
    this.close()
  }

  warmup() {
    return this.#transport.warmup()
  }
}

import {resolve} from 'node:path'

import fs from 'fs-extra'

import NarrationGenerator from '../../../src/lib/ai/NarrationGenerator.ts'
import narrator from './narrator.ts'

export default class KnotNarrationGenerator extends NarrationGenerator {
  constructor(key: string, private readonly cache: string) {
    super(key, narrator.model, narrator.voice)
    // Recordings are cached locally; do not replay a cached provider error.
    this.headers['X-OpenRouter-Cache'] = 'false'
    delete this.headers['X-OpenRouter-Cache-TTL']
  }

  override async request(...args: Parameters<NarrationGenerator['request']>) {
    const response = await super.request(...args)
    await fs.writeJson(resolve(this.cache, 'response.json'), {
      generationId: response.headers.get('x-generation-id'),
      status: response.status,
      contentType: response.headers.get('content-type'),
    }, {spaces: 2})
    return response
  }
}

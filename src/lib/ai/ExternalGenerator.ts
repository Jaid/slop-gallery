import {createOpenRouter} from '@openrouter/ai-sdk-provider'

export default abstract class ExternalGenerator {
  protected readonly provider: ReturnType<typeof createOpenRouter>
  constructor(key: string) {
    this.provider = createOpenRouter({
      apiKey: key,
      headers: {
        'HTTP-Referer': globalThis.location?.origin ?? 'https://github.com/Jaid/slop-gallery',
        'X-OpenRouter-Title': 'Slop Gallery',
      },
    })
  }
}

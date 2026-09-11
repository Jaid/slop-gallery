import {createOpenRouter} from '@openrouter/ai-sdk-provider'

export default abstract class {
  protected readonly headers: Record<string, string>

  protected readonly provider: ReturnType<typeof createOpenRouter>

  constructor(private readonly key: string) {
    const headers = {
      'HTTP-Referer': 'https://slop.gallery',
      'X-OpenRouter-Title': 'Slop Gallery',
      'X-OpenRouter-Categories': 'game,image-gen',
    }
    this.headers = headers
    if (globalThis.window !== globalThis) {
      // These only work outside of a browser context because of CORS restrictions
      Object.assign(headers, {
        'X-OpenRouter-Cache': 'true',
        'X-OpenRouter-Cache-TTL': '86400',
      })
    }
    this.provider = createOpenRouter({
      apiKey: key,
      extraBody: {
        temperature: 0,
        seed: 1,
      },
      headers,
    })
  }
  /** Raw endpoints share the SDK’s app attribution, including offline generation scripts. */
  request(path: string, init: RequestInit = {}) {
    const url = new URL(path, 'https://openrouter.ai/api/v1/')
    if (url.origin !== 'https://openrouter.ai' || !url.pathname.startsWith('/api/')) {
      throw new Error('ExternalGenerator only accepts OpenRouter API endpoints.')
    }
    const headers = new Headers(init.headers)
    for (const [name, value] of Object.entries(this.headers)) {
      headers.set(name, value)
    }
    headers.set('Authorization', `Bearer ${this.key}`)
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    return fetch(url.href, {
      ...init,
      headers,
    })
  }
}

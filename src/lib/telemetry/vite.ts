import type {HttpRequest} from 'telemethree'
import type {Plugin} from 'vite'

import type {IncomingMessage, ServerResponse} from 'node:http'

export type VictoriaRelayOptions = {
  fetch?: HttpRequest
  logs?: string
  metrics?: string
  prefix?: string
  traces?: string
}

/** Fixed destinations only. Never forward cookies, credentials or arbitrary client URLs. */
export function createVictoriaRelay(options: VictoriaRelayOptions = {}) {
  const prefix = (options.prefix ?? '/api/telemetry').replace(/\/$/u, '')
  const targets = new Map([
    [`${prefix}/metrics`, options.metrics ?? 'http://10.0.0.22:3304/api/v1/import'],
    [`${prefix}/logs`, options.logs ?? 'http://10.0.0.22:4318/v1/logs'],
    [`${prefix}/traces`, options.traces ?? 'http://10.0.0.22:4318/v1/traces'],
  ])
  const handle = async (request: IncomingMessage, response: ServerResponse, target: string) => {
    if (request.method !== 'POST') {
      response.writeHead(405, {Allow: 'POST'}).end()
      return
    }
    const origin = request.headers.origin
    if (origin && new URL(origin).host !== request.headers.host) {
      response.writeHead(403).end()
      return
    }
    const metrics = request.url === `${prefix}/metrics`
    const contentType = metrics ? 'application/stream+json' : 'application/json'
    if (request.headers['content-type']?.split(';')[0]?.trim() !== contentType) {
      response.writeHead(415).end()
      return
    }
    const chunks: Array<Uint8Array> = []
    let length = 0
    for await (const chunk of request) {
      const bytes: unknown = chunk
      if (!(bytes instanceof Uint8Array)) {
        response.writeHead(400).end()
        return
      }
      length += bytes.byteLength
      if (length > 262_144) {
        response.writeHead(413).end()
        return
      }
      chunks.push(bytes)
    }
    const upstream = await (options.fetch ?? globalThis.fetch)(target, {
      method: 'POST',
      headers: {'Content-Type': contentType},
      body: Buffer.concat(chunks),
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    })
    const body = await upstream.text()
    const headers: Record<string, string> = {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      'Cache-Control': 'no-store',
    }
    const retryAfter = upstream.headers.get('Retry-After')
    if (retryAfter) {
      headers['Retry-After'] = retryAfter
    }
    response.writeHead(upstream.status, headers).end(body)
  }
  return (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const target = targets.get(request.url ?? '')
    if (!target) {
      next()
      return
    }
    // eslint-disable-next-line promise/prefer-await-to-then -- Connect middleware must return synchronously; handle asynchronous failures here.
    handle(request, response, target).catch(() => {
      if (!response.headersSent) {
        response.writeHead(502, {'Content-Type': 'application/json'})
      }
      response.end(JSON.stringify({error: 'Telemetry upstream unavailable.'}))
    })
  }
}

export function victoriaTelemetry(options: VictoriaRelayOptions = {}): Plugin {
  const middleware = createVictoriaRelay(options)
  return {
    name: 'slop-gallery-victoria-telemetry',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

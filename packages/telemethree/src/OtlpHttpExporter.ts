import type {ExportBatch, Signal, TelemetryExporter} from './types.ts'

import {ExportError} from './ExportError.ts'
import {encodeOtlp} from './otlp.ts'

export type HttpRequest = (url: string, init: RequestInit) => Promise<Response>
export type HttpExporterOptions = {
  endpoint: string
  endpoints?: Partial<Record<Signal, string>>
  fetch?: HttpRequest
  headers?: Record<string, string>
  timeoutMs?: number
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

export class OtlpHttpExporter implements TelemetryExporter {
  constructor(protected readonly options: HttpExporterOptions) {}

  async export(batch: ExportBatch) {
    const response = await this.post(batch.signal, JSON.stringify(encodeOtlp(batch)))
    if (response.status !== 200) {
      await response.body?.cancel()
      throw new ExportError('Expected HTTP 200 from the OTLP exporter.', false)
    }
    if (response.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
      await response.body?.cancel()
      throw new ExportError('Expected an OTLP JSON response.', false)
    }
    let result: unknown
    try {
      result = await response.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ExportError('Invalid OTLP JSON response.', false)
      }
      throw error
    }
    if (!object(result)) {
      throw new ExportError('Invalid OTLP export response.', false)
    }
    if (result.partialSuccess === undefined) {
      return
    }
    const partial = result.partialSuccess
    if (!object(partial)) {
      throw new ExportError('Invalid OTLP partial-success response.', false)
    }
    const field = {
      metrics: 'rejectedDataPoints',
      logs: 'rejectedLogRecords',
      traces: 'rejectedSpans',
    }[batch.signal]
    const value = partial[field] === undefined ? 0 : partial[field]
    const rejected = Number(value)
    if (!['number', 'string'].includes(typeof value) || typeof value === 'string' && !/^\d+$/u.test(value) || !Number.isSafeInteger(rejected) || rejected < 0 || partial.errorMessage !== undefined && typeof partial.errorMessage !== 'string') {
      throw new ExportError('Invalid OTLP partial-success fields.', false)
    }
    // OTLP explicitly forbids retrying partial success: already accepted records would duplicate.
    return {
      rejected,
      warning: typeof partial.errorMessage === 'string' && partial.errorMessage ? partial.errorMessage : undefined,
    }
  }

  protected async post(signal: Signal, body: string, contentType = 'application/json') {
    const endpoint = this.options.endpoints?.[signal] ?? `${this.options.endpoint.replace(/\/$/u, '')}/v1/${signal}`
    const response = await (this.options.fetch ?? globalThis.fetch)(endpoint, {
      method: 'POST',
      body,
      headers: {
        ...this.options.headers,
        'Content-Type': contentType,
      },
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      // Larger normal batches use ordinary fetch; the browser caps keepalive bytes globally.
      keepalive: (new TextEncoder).encode(body).byteLength <= 16_384,
      signal: AbortSignal.timeout(this.options.timeoutMs ?? 10_000),
    })
    if (!response.ok) {
      const retryAfter = response.headers.get('Retry-After')
      let delay = 0
      if (retryAfter !== null) {
        delay = /^\d+(?:\.\d+)?$/u.test(retryAfter) ? Number(retryAfter) * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now())
      }
      await response.body?.cancel()
      throw new ExportError(`Telemetry ${signal} returned HTTP ${response.status}.`, [429, 502, 503, 504].includes(response.status), Number.isFinite(delay) ? delay : 0)
    }
    return response
  }
}

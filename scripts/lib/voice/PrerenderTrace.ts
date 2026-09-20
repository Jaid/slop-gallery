import type {CharacterTimestamp} from 'grok-speaker'
import type {Attributes, Span} from 'victoria-browser-client'

import VictoriaClient from 'victoria-browser-client'

const now = () => performance.timeOrigin + performance.now()
const decoder = new TextDecoder

/** Awaited Victoria delivery for the paid voice-prerender pipeline. */
export default class PrerenderTrace {
  readonly root: Span
  private readonly client: VictoriaClient

  constructor(endpoint: string, private readonly required: boolean, attributes: Attributes) {
    const url = new URL(endpoint)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) {
      throw new TypeError('Telemetry endpoint must be an HTTP(S) ingestion URL without embedded credentials or a fragment.')
    }
    this.client = new VictoriaClient({
      serviceName: 'slop-gallery',
      interval: false,
      keepalive: false,
      maxAttempts: 1,
      maxAttributeBytes: 32_000,
      maxBatchBytes: 256_000,
      maxBatchItems: 16,
      maxItemBytes: 64_000,
      endpoints: {
        logs: false,
        metrics: false,
        traces: {
          url: url.href,
          format: 'otlp-json',
          acknowledgment: 'otlp',
        },
      },
      resource: {'service.namespace': 'scripts'},
      fetch: (target, init) => globalThis.fetch(target, init),
      now,
    })
    this.root = this.client.startSpan('voice.prerender', {attributes})
  }

  /** Encoded pending trace requests for local recovery/debugging. */
  get records(): Array<unknown> {
    const outbox = this.client.delivery.outbox
    return outbox.peek('traces', outbox.highWater(), Number.MAX_SAFE_INTEGER).map(item => JSON.parse(decoder.decode(item.body)) as unknown)
  }

  async preflight() {
    const span = this.client.startSpan('voice.prerender.telemetry.preflight', {
      attributes: {'telemetry.required': this.required},
      parent: this.root,
    })
    span.end()
    return this.send()
  }

  async send() {
    try {
      if (this.required) {
        await this.client.sync({required: true})
        return true
      }
      return await this.client.sync({required: false})
    } catch (error) {
      if (this.required) {
        throw new Error('Required Victoria trace delivery failed.', {cause: error})
      }
      console.warn('Victoria trace delivery failed; continuing because forceTelemetry is disabled.')
      return false
    }
  }

  startSpan(name: string, attributes: Attributes = {}) {
    return this.client.startSpan(name, {
      attributes,
      parent: this.root,
    })
  }

  timings(timestamps: ReadonlyArray<CharacterTimestamp>) {
    // Character-level alignment can exceed a span's event budget, so export bounded
    // child spans directly; offset/count allow complete ordered reconstruction.
    for (let index = 0; index < timestamps.length; index += 128) {
      const chunk = timestamps.slice(index, index + 128)
      this.startSpan('voice.prerender.timings', {
        'voice.timings.offset': index,
        'voice.timings.count': chunk.length,
        'voice.timings.unit': 's',
        'voice.timings.json': JSON.stringify(chunk),
      }).end()
    }
  }
}

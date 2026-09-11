import type {CharacterTimestamp} from 'grok-speaker'
import type {Attributes, Trace} from 'telemethree'

import composeId from 'compose-id'
import {OtlpHttpExporter, Span} from 'telemethree'

const now = () => performance.timeOrigin + performance.now()

/** Awaited OTLP delivery, not the game’s intentionally best-effort telemetry queue. */
export default class PrerenderTrace {
  readonly records: Array<Trace> = []
  readonly root: Span
  private readonly exporter: OtlpHttpExporter
  private readonly resource: Attributes

  constructor(endpoint: string, private readonly required: boolean, attributes: Attributes) {
    const url = new URL(endpoint)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) {
      throw new TypeError('Telemetry endpoint must be an HTTP(S) ingestion URL without embedded credentials or a fragment.')
    }
    this.exporter = new OtlpHttpExporter({
      endpoint: '',
      endpoints: {traces: url.href},
    })
    this.resource = {
      'service.name': 'slop-gallery',
      'service.namespace': 'scripts',
      'service.instance.id': composeId(),
    }
    this.root = new Span('voice.prerender', attributes, now, record => this.records.push(record))
  }

  async preflight() {
    const records: Array<Trace> = []
    const span = new Span('voice.prerender.telemetry.preflight', {'telemetry.required': this.required}, now, record => records.push(record), this.root)
    span.end()
    return this.send(records)
  }

  async send(records: ReadonlyArray<Trace> = this.records) {
    try {
      for (let index = 0; index < records.length; index += 16) {
        const result = await this.exporter.export({
          signal: 'traces',
          resource: this.resource,
          records: records.slice(index, index + 16),
        })
        if (result?.rejected || result?.warning) {
          throw new Error('Victoria did not fully accept the voice trace.')
        }
      }
      return true
    } catch (error) {
      if (this.required) {
        throw new Error('Required Victoria trace delivery failed.', {cause: error})
      }
      console.warn('Victoria trace delivery failed; continuing because forceTelemetry is disabled.')
      return false
    }
  }

  startSpan(name: string, attributes: Attributes = {}) {
    return new Span(name, attributes, now, record => this.records.push(record), this.root)
  }

  timings(timestamps: ReadonlyArray<CharacterTimestamp>) {
    // Character-level alignment can exceed both Span.addEvent’s limit and Telemetry’s record limit.
    // Export bounded child spans directly; index/count allow complete, ordered reconstruction.
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

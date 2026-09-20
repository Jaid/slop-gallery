import type {Attributes, LogOptions, MetricOptions, SpanOptions} from 'victoria-browser-client'

import {Span} from 'victoria-browser-client'

export type MetricRecord = {
  attributes: Attributes
  name: string
  unit: string
  value: number
}
export type TraceRecord = {
  attributes: Attributes
  droppedEventsCount: number
  endTime: number
  events: Array<{
    attributes: Attributes
    name: string
    time: number
  }>
  name: string
  parentSpanId?: string
  spanId: string
  startTime: number
  status: 'error' | 'ok' | 'unset'
  traceId: string
}

const attributes = (entries: ReadonlyArray<{
  key: string
  value: Record<string, unknown>
}>): Attributes => Object.fromEntries(entries.map(({key, value}) => [
  key,
  value.stringValue ?? value.doubleValue ?? value.boolValue ?? value.intValue,
])) as Attributes
const milliseconds = (nanoseconds: string) => Number(nanoseconds) / 1_000_000
const status = (code: number): TraceRecord['status'] => {
  if (code === 1) {
    return 'ok'
  }
  if (code === 2) {
    return 'error'
  }
  return 'unset'
}

export default class TestTelemetry {
  readonly logs: Array<{
    attributes: Attributes
    level: string
    message: string
  }> = []
  readonly metrics: Array<MetricRecord> = []
  readonly traces: Array<TraceRecord> = []
  private readonly counters = new Map<string, number>

  constructor(readonly now: () => number) {}

  increment(name: string, amount = 1, options: MetricOptions = {}) {
    const attrs = {...options.attributes}
    const key = JSON.stringify([name, Object.entries(attrs).toSorted(([a], [b]) => a.localeCompare(b))])
    const value = (this.counters.get(key) ?? 0) + amount
    this.counters.set(key, value)
    return this.metric(name, value, options)
  }

  log(message: string, options: LogOptions = {}) {
    this.logs.push({
      message,
      level: options.level ?? 'info',
      attributes: {...options.attributes},
    })
    return true
  }

  metric(name: string, value: number, options: MetricOptions = {}) {
    this.metrics.push({
      name,
      value,
      unit: options.unit ?? '1',
      attributes: {...options.attributes},
    })
    return true
  }

  startSpan(name: string, options: SpanOptions = {}) {
    return new Span(name, record => {
      this.traces.push({
        name: record.name,
        traceId: record.traceId,
        spanId: record.spanId,
        parentSpanId: record.parentSpanId,
        startTime: milliseconds(record.startTimeUnixNano),
        endTime: milliseconds(record.endTimeUnixNano),
        status: status(record.status.code),
        attributes: attributes(record.attributes),
        droppedEventsCount: record.droppedEventsCount,
        events: record.events.map(event => ({
          name: event.name,
          time: milliseconds(event.timeUnixNano),
          attributes: attributes(event.attributes),
        })),
      })
      return true
    }, options, undefined, this.now)
  }
}

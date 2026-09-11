import type {Attributes, ExportBatch, Log, MetricOptions, Records, Signal, TelemetryOptions, TraceContext} from './types.ts'

import ExportError from './ExportError.ts'
import Span from './Span.ts'

const signals = ['metrics', 'logs', 'traces'] as const
const positiveInteger = (value: number, name: string) => {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer.`)
  }
  return value
}
type Pending = {bytes: number
  record: Records[Signal]}
type Queue = {dropped: number
  failures: number
  lastError: string | null
  pending: Array<Pending>
  retryAt: number
  sent: number}

const createQueue = (): Queue => ({
  pending: [],
  failures: 0,
  retryAt: 0,
  dropped: 0,
  sent: 0,
  lastError: null,
})

/** Framework-independent, bounded, best-effort telemetry. Construction performs no I/O. */
export default class Telemetry {
  readonly now: () => number
  private readonly counters = new Map<string, {startTime: number
    value: number}>
  private readonly descriptors = new Map<string, string>
  private disposed = false
  private readonly flushIntervalMs: number
  private readonly maxBatchSize: number
  private readonly maxQueueSize: number
  private readonly maxRecordBytes: number
  private readonly maxSeries: number
  private readonly queues: Record<Signal, Queue> = {
    metrics: createQueue(),
    logs: createQueue(),
    traces: createQueue(),
  }
  private readonly resource: Attributes
  private running: Promise<void> | undefined
  private timer: ReturnType<typeof setInterval> | undefined
  private users = 0

  constructor(private readonly options: TelemetryOptions) {
    this.resource = {...options.resource}
    this.now = options.now ?? (() => performance.timeOrigin + performance.now())
    this.maxQueueSize = positiveInteger(options.maxQueueSize ?? 2048, 'maxQueueSize')
    this.maxBatchSize = positiveInteger(options.maxBatchSize ?? 256, 'maxBatchSize')
    this.maxRecordBytes = positiveInteger(options.maxRecordBytes ?? 16_384, 'maxRecordBytes')
    this.maxSeries = positiveInteger(options.maxSeries ?? 1024, 'maxSeries')
    this.flushIntervalMs = positiveInteger(options.flushIntervalMs ?? 5000, 'flushIntervalMs')
  }

  count(name: string, amount = 1, options: MetricOptions = {}) {
    this.recordMetric(name, amount, 'counter', options)
  }

  /** Stop accepting records, stop timers and attempt one final bounded flush. */
  async dispose() {
    this.disposed = true
    clearInterval(this.timer)
    this.timer = undefined
    await this.flush()
  }

  /** One bounded batch per signal; failed signals do not block the others. Never rejects. */
  flush(): Promise<void> {
    this.running ??= this.flushAll()
    return this.running
  }

  flushInBackground() {
    // eslint-disable-next-line promise/prefer-await-to-then -- Synchronous lifecycle callbacks cannot await delivery; status() exposes failures.
    this.flush().catch(() => {})
  }

  log(message: string, level: Log['level'] = 'info', attributes: Attributes = {}, context?: TraceContext) {
    this.push('logs', {
      message,
      level,
      attributes: {...attributes},
      time: this.now(),
      context: context ? {
        traceId: context.traceId,
        spanId: context.spanId,
      } : undefined,
    })
  }

  metric(name: string, value: number, options: MetricOptions = {}) {
    this.recordMetric(name, value, 'gauge', options)
  }

  /** Reference-counted timer ownership works with providers, multiple consumers and StrictMode. */
  start() {
    if (this.disposed) {
      return () => {}
    }
    this.users++
    this.timer ??= setInterval(() => {
      this.flushInBackground()
    }, this.flushIntervalMs)
    let stopped = false
    return () => {
      if (stopped) {
        return
      }
      stopped = true
      this.users--
      if (!this.users) {
        clearInterval(this.timer)
        this.timer = undefined
        this.flushInBackground()
      }
    }
  }

  startSpan(name: string, attributes: Attributes = {}, parent?: TraceContext, startTime?: number) {
    return new Span(name, {...attributes}, this.now, trace => this.push('traces', trace), parent ? {...parent} : undefined, startTime)
  }

  status() {
    return Object.fromEntries(signals.map(signal => {
      const {pending, ...status} = this.queues[signal]
      return [
        signal, {
          ...status,
          pending: pending.length,
        },
      ]
    })) as Record<Signal, Omit<Queue, 'pending'> & {pending: number}>
  }

  async trace<T>(name: string, operation: (span: Span) => Promise<T> | T, attributes: Attributes = {}, parent?: TraceContext): Promise<T> {
    const span = this.startSpan(name, attributes, parent)
    try {
      const result = await operation(span)
      span.end()
      return result
    } catch (error) {
      span.end('error', {'error.type': error instanceof Error ? error.name : typeof error})
      throw error
    }
  }

  private async flushAll() {
    try {
      await Promise.all(signals.map(signal => this.flushSignal(signal)))
    } finally {
      this.running = undefined
    }
  }

  private async flushSignal(signal: Signal) {
    const queue = this.queues[signal]
    if (!queue.pending.length || this.now() < queue.retryAt) {
      return
    }
    const pending: Array<Pending> = []
    let bytes = 0
    for (const item of queue.pending) {
      if (pending.length && (pending.length >= this.maxBatchSize || bytes + item.bytes > 65_536)) {
        break
      }
      pending.push(item)
      bytes += item.bytes
    }
    const batch: ExportBatch = {
      signal,
      records: pending.map(item => item.record),
      resource: this.resource,
    }
    try {
      const result = await this.options.exporter.export(batch)
      queue.pending.splice(0, pending.length)
      const rejected = Math.min(pending.length, Math.max(0, result?.rejected ?? 0))
      queue.sent += pending.length - rejected
      queue.dropped += rejected
      queue.failures = 0
      queue.retryAt = 0
      queue.lastError = result?.warning ?? (rejected ? `Exporter rejected ${rejected} records.` : null)
    } catch (error) {
      queue.lastError = error instanceof Error ? error.message : String(error)
      if (error instanceof ExportError && !error.retryable) {
        queue.pending.splice(0, pending.length)
        queue.dropped += pending.length
        queue.failures = 0
        queue.retryAt = 0
      } else {
        queue.failures++
        queue.retryAt = this.now() + Math.max(error instanceof ExportError ? error.retryAfterMs : 0, Math.min(60_000, 1000 * 2 ** Math.min(queue.failures - 1, 6))) * (1 + Math.random() * 0.2)
      }
    }
  }

  private push<S extends Signal>(signal: S, record: Records[S]) {
    if (this.disposed) {
      return
    }
    const queue = this.queues[signal]
    const bytes = (new TextEncoder).encode(JSON.stringify(record)).byteLength
    // Preserve queued/in-flight data; drop newest on overflow. No unbounded offline backlog.
    if (bytes > this.maxRecordBytes || queue.pending.length >= this.maxQueueSize) {
      queue.dropped++
      return
    }
    queue.pending.push({
      record,
      bytes,
    })
  }

  private recordMetric(name: string, value: number, kind: 'counter' | 'gauge', options: MetricOptions) {
    if (this.disposed || !Number.isFinite(value) || kind === 'counter' && value < 0) {
      return
    }
    const attributes = {...options.attributes}
    const unit = options.unit ?? '1'
    const descriptor = `${kind}:${unit}`
    if (!name || this.descriptors.has(name) && this.descriptors.get(name) !== descriptor || !this.descriptors.has(name) && this.descriptors.size >= this.maxSeries) {
      this.queues.metrics.dropped++
      return
    }
    this.descriptors.set(name, descriptor)
    const time = this.now()
    let startTime = time
    if (kind === 'counter') {
      const key = JSON.stringify([name, Object.entries(attributes).toSorted(([a], [b]) => a.localeCompare(b))])
      let counter = this.counters.get(key)
      if (!counter) {
        if (this.counters.size >= this.maxSeries) {
          this.queues.metrics.dropped++
          return
        }
        counter = {
          value: 0,
          startTime: time,
        }
        this.counters.set(key, counter)
      }
      if (!Number.isFinite(counter.value + value)) {
        return
      }
      counter.value += value
      value = counter.value
      startTime = counter.startTime
    }
    this.push('metrics', {
      name,
      value,
      unit,
      kind,
      time,
      startTime,
      attributes,
    })
  }
}

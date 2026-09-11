import type {Attributes, SpanEvent, Trace, TraceContext} from './types.ts'

const id = (bytes: number) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), value => value.toString(16).padStart(2, '0')).join('')

export default class Span implements TraceContext {
  readonly spanId = id(8)
  readonly traceId: string
  private droppedEventsCount = 0
  private ended = false
  private eventBytes = 0
  private readonly events: Array<SpanEvent> = []
  private readonly startTime: number

  constructor(private readonly name: string, private readonly attributes: Attributes, private readonly now: () => number, private readonly push: (trace: Trace) => void, private readonly parent?: TraceContext, startTime = now()) {
    this.traceId = parent?.traceId ?? id(16)
    this.startTime = Number.isFinite(startTime) ? startTime : now()
  }

  /** Events are snapshotted and bounded even on a session that stays open for days. */
  addEvent(name: string, attributes: Attributes = {}, time = this.now()) {
    if (this.ended || !Number.isFinite(time)) {
      return
    }
    const event = {
      name,
      attributes: {...attributes},
      time,
    }
    const bytes = (new TextEncoder).encode(JSON.stringify(event)).byteLength
    if (this.events.length >= 64 || this.eventBytes + bytes > 8192) {
      this.droppedEventsCount++
      return
    }
    this.eventBytes += bytes
    this.events.push(event)
  }

  /** Ending twice is harmless. Context is explicit, including across async boundaries. */
  end(status: Trace['status'] = 'ok', attributes: Attributes = {}, endTime = this.now()) {
    if (this.ended) {
      return
    }
    this.ended = true
    this.push({
      name: this.name,
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parent?.spanId,
      startTime: this.startTime,
      endTime: Math.max(this.startTime, Number.isFinite(endTime) ? endTime : this.now()),
      attributes: {
        ...this.attributes,
        ...attributes,
      },
      status,
      events: this.events,
      droppedEventsCount: this.droppedEventsCount,
    })
  }
}

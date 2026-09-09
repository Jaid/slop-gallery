import type {Attributes, Trace, TraceContext} from './types.ts'

const id = (bytes: number) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), value => value.toString(16).padStart(2, '0')).join('')

export class Span implements TraceContext {
  readonly spanId = id(8)
  readonly traceId: string
  private ended = false
  private readonly startTime: number

  constructor(private readonly name: string, private readonly attributes: Attributes, private readonly now: () => number, private readonly push: (trace: Trace) => void, private readonly parent?: TraceContext) {
    this.traceId = parent?.traceId ?? id(16)
    this.startTime = now()
  }

  /** Ending twice is harmless. Context is explicit, including across async boundaries. */
  end(status: Trace['status'] = 'ok', attributes: Attributes = {}) {
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
      endTime: Math.max(this.startTime, this.now()),
      attributes: {
        ...this.attributes,
        ...attributes,
      },
      status,
    })
  }
}

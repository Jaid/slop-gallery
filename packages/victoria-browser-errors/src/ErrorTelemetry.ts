import type {StackFrame} from './stack.ts'
import type VictoriaClient from 'victoria-browser-client'
import type {Attributes, TraceContext} from 'victoria-browser-client'

import {cleanFile, formatFrame, parseStack} from './stack.ts'

export type TelemetryClient = Pick<VictoriaClient, 'log'>
/** what errors are heard on, like `window` */
export type ErrorTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
export type ErrorKind = 'uncaught' | 'unhandled_rejection'

export type ErrorTelemetryOptions = {
  /** more attributes for every record, or a function asked for them as each one is made, like the current room */
  attributes?: (() => Attributes) | Attributes
  /** put in front of the `event.name` of every record, like `gallery.` for `gallery.error.uncaught` */
  eventNamePrefix?: string
  /** the trace the records belong to, like the active session span */
  getContext?: () => TraceContext | undefined
  /** how many records the same error, by its kind, type and position, makes at most, so one thrown every frame cannot flood the queue; defaults to 10 */
  limit?: number
  /** defaults to `globalThis` */
  target?: ErrorTarget
  telemetry: TelemetryClient
}

/** the most frames `code.stacktrace` lists */
const maxFrames = 20
/** Whether the value is an error, a `DOMException` like an `AbortError` included, which not every engine’s `Error.isError` counts yet. */
const isError = (value: unknown): value is Error => Error.isError(value) || typeof DOMException === 'function' && value instanceof DOMException

/** The error’s name, like `TypeError`, or what kind of value was thrown instead of an error. */
export function errorType(value: unknown) {
  if (isError(value)) {
    return value.name
  }
  return value === null ? 'null' : typeof value
}

/**
 * Logs every uncaught error and unhandled promise rejection the target hears as `error.uncaught` and `error.unhandled_rejection`, at level `error`.
 * Records never carry exception messages, which may hold anything: only the error’s type, where it was thrown and the frames of its stack, without the message line.
 */
export default class ErrorTelemetry {
  private readonly occurrences = new Map<string, number>

  constructor(private readonly options: ErrorTelemetryOptions) {}

  /** Starts listening; returns the cleanup, which only removes the listeners. */
  connect() {
    const {target = globalThis} = this.options
    const controller = new AbortController
    const {signal} = controller
    target.addEventListener('error', event => this.uncaught(event), {signal})
    target.addEventListener('unhandledrejection', event => this.unhandled(event), {signal})
    return () => controller.abort()
  }

  /** Logs the error unless its limit is reached; returns whether it did. Telemetry failures are swallowed, since throwing here would only report another error. */
  record(kind: ErrorKind, error: unknown, position?: StackFrame) {
    try {
      const {attributes, eventNamePrefix = '', getContext, limit = 10, telemetry} = this.options
      const type = errorType(error)
      const frames = isError(error) ? parseStack(error.stack) : []
      const at = position ?? frames.at(0)
      const signature = `${kind} ${type} ${at ? formatFrame(at) : ''}`
      const occurrence = (this.occurrences.get(signature) ?? 0) + 1
      this.occurrences.set(signature, occurrence)
      if (occurrence > limit) {
        return false
      }
      const where = at ? ` at ${at.file}:${at.line}:${at.column}` : ''
      return telemetry.log(kind === 'uncaught' ? `Uncaught ${type}${where}` : `Unhandled rejection: ${type}${where}`, {
        level: 'error',
        attributes: {
          ...typeof attributes === 'function' ? attributes() : attributes,
          'event.name': `${eventNamePrefix}error.${kind}`,
          'error.type': type,
          'error.occurrence': occurrence,
          ...at ? {
            'code.file.path': at.file,
            'code.line.number': at.line,
            'code.column.number': at.column,
            ...at.function ? {'code.function.name': at.function} : {},
          } : {},
          ...frames.length ? {'code.stacktrace': frames.slice(0, maxFrames).map(formatFrame).join('\n')} : {},
        },
        context: getContext?.(),
      })
    } catch {
      return false
    }
  }

  private uncaught(event: Event) {
    const {colno, filename, lineno} = event as Partial<ErrorEvent>
    // A script of another origin only reports “Script error.” without an error or a position.
    const thrown = ((event as Partial<ErrorEvent>).error as unknown) ?? undefined
    const position: StackFrame | undefined = filename ? {
      file: cleanFile(filename),
      line: lineno ?? 0,
      column: colno ?? 0,
    } : undefined
    this.record('uncaught', thrown === undefined && !position ? new UnknownError : thrown, position)
  }

  private unhandled(event: Event) {
    this.record('unhandled_rejection', (event as Partial<PromiseRejectionEvent>).reason)
  }
}

/** stands in for an error the browser hides, like one of a script of another origin */
class UnknownError extends Error {
  override name = 'UnknownError'
  override stack = ''
}

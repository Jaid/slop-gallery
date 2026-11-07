import type Fusion from '../gallery/fusion/Fusion.ts'
import type SlopGalleryTelemetry from './SlopGalleryTelemetry.ts'
import type {Attributes, Span} from 'victoria-browser-client'

import {errorType} from 'victoria-browser-errors'

/** how a fusion ended: its result flipped out, it came back as it went in, the player broke it off, it went wrong, or it was dropped without an outcome, like when its portrait went away mid-request or the director was disposed */
export type FusionTraceOutcome = 'aborted' | 'canceled' | 'failed' | 'succeeded' | 'unchanged'

const seconds = (value: number | undefined) => (value === undefined ? undefined : Math.round(value * 1000) / 1000)

/**
 * A fusion as a `gallery.fusion` span, from its portal opening until its director is done with it, under the active session context. The image model’s request is a `gallery.fusion.generate` span inside it.
 * The player breaking the fusion off by jumping into its portal is a `gallery.fusion.cancellation_triggered` event on it, and its end tells the outcome.
 */
export default class FusionTrace {
  readonly span: Span
  private ended = false
  private error: string | undefined

  constructor(private readonly telemetry: SlopGalleryTelemetry, private readonly fusion: Fusion, private readonly unchanged: boolean, attributes: Attributes) {
    this.span = telemetry.startSpan('gallery.fusion', {attributes: {
      'fusion.id': fusion.id,
      'fusion.partner': fusion.spec.partner.kind,
      'fusion.unchanged': unchanged,
      ...fusion.spec.partner.kind === 'item' ? {
        'item.id': fusion.spec.partner.id,
        'item.consumed': fusion.spec.partner.consumed ?? false,
      } : {},
      ...attributes,
    }})
    // Only the player breaking the fusion off aborts its signal.
    fusion.signal.addEventListener('abort', () => {
      this.span.addEvent('gallery.fusion.cancellation_triggered', {
        'cancellation.trigger': 'portal_jump',
        'fusion.elapsed_s': seconds(fusion.canceledAt) ?? 0,
      })
    }, {once: true})
  }

  /** how the fusion went, by what it got to show and whether something went wrong */
  get outcome(): FusionTraceOutcome {
    const {canceledAt, emergedAt, outcome} = this.fusion
    if (emergedAt !== undefined) {
      return this.unchanged ? 'unchanged' : 'succeeded'
    }
    if (canceledAt !== undefined) {
      return 'canceled'
    }
    return this.error !== undefined || outcome?.kind === 'failure' ? 'failed' : 'aborted'
  }

  /** Ends the span with the outcome and when its steps happened, in seconds into the fusion. Does nothing the second time. */
  end() {
    if (this.ended) {
      return
    }
    this.ended = true
    const {canceledAt, emergedAt, outcome} = this.fusion
    const result = this.outcome
    this.span.end(result === 'failed' ? 'error' : 'ok', Object.fromEntries(Object.entries({
      'fusion.outcome': result,
      'fusion.outcome_at_s': seconds(outcome?.at),
      'fusion.emerged_at_s': seconds(emergedAt),
      'fusion.canceled_at_s': seconds(canceledAt),
      'error.type': result === 'failed' ? this.error : undefined,
    }).filter(([, value]) => value !== undefined)) as Attributes)
  }

  /** Notes what went wrong, which makes the fusion fail unless the player broke it off. */
  fail(error: unknown) {
    this.error ??= errorType(error)
  }

  /** Runs the image model’s request as a `gallery.fusion.generate` span inside the fusion’s. */
  generate<T>(operation: (span: Span) => Promise<T>, attributes: Attributes = {}) {
    return this.telemetry.wrap('gallery.fusion.generate', operation, {
      attributes,
      parent: this.span,
    })
  }
}

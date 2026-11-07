import type Fusion from '../gallery/fusion/Fusion.ts'
import type FusionRecipe from '../gallery/fusion/FusionRecipe.ts'
import type SlopGalleryTelemetry from './SlopGalleryTelemetry.ts'
import type {Attributes, Span} from 'victoria-browser-client'

import {errorType} from 'victoria-browser-errors'

/** how a fusion ended: a new output portrait flipped out, the hung portrait itself came back out as the output as nothing was contributed to merge it with, the player broke it off, it went wrong, or it was dropped without an outcome, like when its hung portrait went away mid-request or the director was disposed */
export type FusionTraceOutcome = 'aborted' | 'canceled' | 'failed' | 'succeeded' | 'unchanged'
/** an item among a fusion’s ingredients */
export type FusionTraceItem = {
  /** whether a success uses it up, like an orb */
  consumed: boolean
  /** its prop id */
  id: string
}
export type FusionTraceOptions = {
  /** more attributes for the span, like the mode and the room */
  attributes?: Attributes
  /** the items among the ingredients, in their order */
  items?: ReadonlyArray<FusionTraceItem>
  /** the fusion’s ingredients, the hung portrait first, and whether they leave it unchanged */
  recipe: Pick<FusionRecipe, 'ingredients' | 'unchanged'>
}

const seconds = (value: number | undefined) => (value === undefined ? undefined : Math.round(value * 1000) / 1000)

/**
 * A fusion, which merges 2 to 4 ingredients, the first always the hung portrait, into one output portrait, as a `gallery.fusion` span from its portal opening until its director is done with it, under the active session context. The image model’s request is a `gallery.fusion.generate` span inside it.
 * The player breaking the fusion off by jumping into its portal is a `gallery.fusion.cancellation_triggered` event on it, and its end tells the outcome.
 */
export default class FusionTrace {
  readonly span: Span
  private ended = false
  private error: string | undefined
  private readonly unchanged: boolean

  constructor(private readonly telemetry: SlopGalleryTelemetry, private readonly fusion: Fusion, {attributes, items = [], recipe}: FusionTraceOptions) {
    this.unchanged = recipe.unchanged
    const consumable = items.filter(item => item.consumed)
    this.span = telemetry.startSpan('gallery.fusion', {attributes: {
      'fusion.id': fusion.id,
      'fusion.ingredients': recipe.ingredients.length,
      'fusion.ingredient_kinds': recipe.ingredients.map(ingredient => ingredient.kind).join(','),
      'fusion.unchanged': recipe.unchanged,
      ...items.length ? {'fusion.items': items.map(item => item.id).join(',')} : {},
      ...consumable.length ? {'fusion.consumable_items': consumable.map(item => item.id).join(',')} : {},
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

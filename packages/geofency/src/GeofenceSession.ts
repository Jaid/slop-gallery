import type Geofences from './Geofences.ts'
import type {Fence, Position} from './types.ts'

import EventEmitter from 'eventemitter3'

export type GeofenceSessionEvents<Id> = {
  /** the first matching id changed, null outside of every fence */
  change: [match: Id | null, previous: Id | null]
  /** a fence started to contain the position */
  enter: [id: Id]
  /** a fence stopped containing the position */
  leave: [id: Id]
}

/** Follows a moving position through geofences and reports where it enters and leaves them. */
export default class GeofenceSession<Id = string, Value extends Fence = Fence> extends EventEmitter<GeofenceSessionEvents<Id>> {
  readonly geofences: Geofences<Id, Value>
  private currentMatch: Id | null = null
  private currentMatches: ReadonlySet<Id> = new Set

  constructor(geofences: Geofences<Id, Value>) {
    super()
    this.geofences = geofences
  }

  /** the id of the first fence that contained the last position, or null if none did */
  get match() {
    return this.currentMatch
  }

  /** the ids of every fence that contained the last position, in insertion order */
  get matches(): ReadonlySet<Id> {
    return this.currentMatches
  }

  /**
   * Moves to the position: emits `leave` for every fence left, then `enter` for every fence entered, then `change` if the first match changed.
   * Listeners already see the new state.
   */
  update(position: Position) {
    const previous = this.currentMatches
    const previousMatch = this.currentMatch
    const matches = new Set(this.geofences.getMatches(position))
    const match = matches.values().next().value ?? null
    this.currentMatches = matches
    this.currentMatch = match
    for (const id of previous) {
      if (!matches.has(id)) {
        this.emit('leave', id)
      }
    }
    for (const id of matches) {
      if (!previous.has(id)) {
        this.emit('enter', id)
      }
    }
    if (match !== previousMatch) {
      this.emit('change', match, previousMatch)
    }
    return match
  }
}

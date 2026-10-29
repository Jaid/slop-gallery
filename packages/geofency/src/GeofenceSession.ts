import type Geofences from './Geofences.ts'
import type {Fence, Position} from './types.ts'

import EventEmitter from 'eventemitter3'

export type GeofenceSessionEvents<Id> = {
  /** the first matching id changed; null only with {@link GeofenceSessionOptions.announceEmpty} */
  change: [match: Id | null, previous: Id | null]
  /** a fence started to contain the position */
  enter: [id: Id]
  /** a fence stopped containing the position */
  leave: [id: Id]
}

export type GeofenceSessionOptions<Id = string> = {
  /**
   * whether a position leaving every fence counts: it emits `leave` and `change` to null
   *
   * If `false`, positions without any match are ignored, so the session keeps its last match, like a room while walking through a passage between two rooms.
   */
  announceEmpty?: boolean
  /**
   * the match to start with instead of null, like a room restored from a saved game
   *
   * Set silently: the first {@link GeofenceSession.update} compares against it, so it emits nothing if the position is still in that fence.
   */
  initialValue?: Id | null
  /**
   * whether every matching fence is tracked
   *
   * If `false`, only the first match is tracked, and `enter` and `leave` only report that one.
   */
  multiple?: boolean
}

const emptyMatches: ReadonlySet<never> = new Set

/** Follows a moving position through geofences and reports where it enters and leaves them. */
export default class GeofenceSession<Id = string, Value extends Fence = Fence> extends EventEmitter<GeofenceSessionEvents<Id>> {
  readonly announceEmpty: boolean
  readonly geofences: Geofences<Id, Value>
  readonly multiple: boolean
  private currentMatch: Id | null = null
  private currentMatches: ReadonlySet<Id> = emptyMatches

  constructor(geofences: Geofences<Id, Value>, {multiple = false, announceEmpty = false, initialValue = null}: GeofenceSessionOptions<NoInfer<Id>> = {}) {
    super()
    this.geofences = geofences
    this.multiple = multiple
    this.announceEmpty = announceEmpty
    if (initialValue !== null) {
      this.currentMatch = initialValue
      this.currentMatches = new Set([initialValue])
    }
  }

  /** the id of the first fence that contained the last counted position, or null */
  get match() {
    return this.currentMatch
  }

  /** the ids of every fence that contained the last counted position, in insertion order; just the {@link match} if not {@link multiple} */
  get matches(): ReadonlySet<Id> {
    return this.currentMatches
  }

  /**
   * Moves to the position: emits `leave` for every fence left, then `enter` for every fence entered, then `change` if the first match changed.
   * Listeners already see the new state. Returns the {@link match}.
   */
  update(position: Position) {
    let matches: ReadonlySet<Id>
    if (this.multiple) {
      matches = new Set(this.geofences.getMatches(position))
    } else {
      const match = this.geofences.getMatch(position)
      if (match === this.currentMatch) {
        return this.currentMatch
      }
      matches = match === null ? emptyMatches : new Set([match])
    }
    if (!matches.size && !this.announceEmpty) {
      return this.currentMatch
    }
    const previous = this.currentMatches
    const previousMatch = this.currentMatch
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

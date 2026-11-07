import type SlopGalleryTelemetry from './SlopGalleryTelemetry.ts'
import type Geofences from 'geofency'
import type {Position} from 'geofency'

import {MultimatchGeofenceSession} from 'geofency'

const round = (value: number) => Math.round(value * 1000) / 1000

/**
 * Logs `gallery.geofence.entered` and `gallery.geofence.left` whenever a position, the player’s body, enters or leaves any of the geofences, each fence on its own, so overlapping fences all count and a passage between two rooms leaves the one before entering the next.
 * It starts silently in the fences the first position lies in, like the room session does, so only actually moving across a fence counts.
 */
export default class GeofenceTelemetry<Id extends string = string> {
  private position: Position
  private readonly session: MultimatchGeofenceSession<Id>

  /** `title` names a fence in the log message, like a room by its title, falling back to its id. */
  constructor(telemetry: SlopGalleryTelemetry, geofences: Geofences<Id>, position: Position, title: (id: Id) => string | undefined = () => {}) {
    this.position = position
    this.session = new MultimatchGeofenceSession(geofences, {
      announceEmpty: true,
      initialValue: geofences.getMatches(position),
    })
    const record = (event: 'entered' | 'left', id: Id) => {
      const [x, y, z] = this.position
      telemetry.event(`geofence.${event}`, {
        'geofence.id': id,
        'position.x': round(x),
        'position.y': round(y),
        'position.z': round(z),
      }, `${event === 'entered' ? 'Entered' : 'Left'} geofence: ${title(id) ?? id}`)
    }
    this.session.on('leave', id => record('left', id))
    this.session.on('enter', id => record('entered', id))
  }

  dispose() {
    this.session.removeAllListeners()
  }

  /** Moves to the position, logging every fence left, then every fence entered. */
  update(position: Position) {
    this.position = position
    this.session.update(position)
  }
}

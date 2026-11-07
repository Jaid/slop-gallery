import type SlopGalleryTelemetry from './SlopGalleryTelemetry.ts'
import type Geofences from 'geofency'
import type {Position} from 'geofency'

import {MultimatchGeofenceSession} from 'geofency'

/** a velocity in m/s, in the same axes as a {@link Position} */
type Velocity = readonly [x: number, y: number, z: number]

/** Round to millimeters, or millimeters per second, without negative zero. */
const round = (value: number) => Math.round(value * 1000) / 1000 || 0

/**
 * Logs `gallery.geofence.entered` and `gallery.geofence.left` whenever a position, the player’s body, enters or leaves any of the geofences, each fence on its own, so overlapping fences all count and a passage between two rooms leaves the one before entering the next. Each carries the position and the velocity it crossed the fence at, which tells the direction it came from or went off to.
 * It starts silently in the fences the first position lies in, like the room session does, so only actually moving across a fence counts.
 */
export default class GeofenceTelemetry<Id extends string = string> {
  private position: Position
  private readonly session: MultimatchGeofenceSession<Id>
  private velocity: Velocity = [0, 0, 0]

  /** `title` names a fence in the log message, like a room by its title, falling back to its id. */
  constructor(telemetry: SlopGalleryTelemetry, geofences: Geofences<Id>, position: Position, title: (id: Id) => string | undefined = () => {}) {
    this.position = position
    this.session = new MultimatchGeofenceSession(geofences, {
      announceEmpty: true,
      initialValue: geofences.getMatches(position),
    })
    const record = (event: 'entered' | 'left', id: Id) => {
      const [x, y, z] = this.position
      const [velocityX, velocityY, velocityZ] = this.velocity
      telemetry.event(`geofence.${event}`, {
        'geofence.id': id,
        'position.x': round(x),
        'position.y': round(y),
        'position.z': round(z),
        'velocity.x': round(velocityX),
        'velocity.y': round(velocityY),
        'velocity.z': round(velocityZ),
      }, `${event === 'entered' ? 'Entered' : 'Left'} geofence: ${title(id) ?? id}`)
    }
    this.session.on('leave', id => record('left', id))
    this.session.on('enter', id => record('entered', id))
  }

  dispose() {
    this.session.removeAllListeners()
  }

  /** Moves to the position at the velocity, in m/s, logging every fence left, then every fence entered. */
  update(position: Position, velocity: Velocity) {
    this.position = position
    this.velocity = velocity
    this.session.update(position)
  }
}

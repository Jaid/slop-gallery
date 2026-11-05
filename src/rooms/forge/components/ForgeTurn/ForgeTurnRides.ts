import {propObjects, showPropAt} from '#src/components/Scene/GrabbableProp.tsx'
import {forgeTurnEntry, ForgeTurnRide} from '#src/lib/gallery/forgeTurn.ts'

/**
 * The orbs sliding through the redirection pipe, frame by frame: it takes every orb that flies or rolls into its mouth out of the physics, slides it along the pipe, see {@link ForgeTurnRide}, and hands it back to the physics at the outlet, rolling on across the vestibule.
 */
export default class ForgeTurnRides {
  private readonly rides = new Map<string, ForgeTurnRide>

  /** Takes in what entered the mouth and slides every orb in the pipe on by `delta` seconds. */
  update(delta: number) {
    const step = Math.min(delta, 0.1)
    for (const [id, prop] of propObjects) {
      if (!prop.orb || this.rides.has(id) || prop.seized() || !prop.body.isEnabled()) {
        continue
      }
      const {x, y, z} = prop.body.translation()
      const velocity = prop.body.linvel()
      const along = forgeTurnEntry([x, y, z], [velocity.x, velocity.y, velocity.z])
      if (along !== undefined && prop.seize()) {
        this.rides.set(id, new ForgeTurnRide(along, Math.hypot(velocity.x, velocity.y, velocity.z)))
      }
    }
    for (const [id, ride] of this.rides) {
      const prop = propObjects.get(id)
      if (!prop) {
        this.rides.delete(id)
        continue
      }
      const done = ride.advance(step)
      showPropAt(prop, ride.position())
      if (!done) {
        continue
      }
      const {spin, velocity} = ride.release()
      prop.unleash(velocity, spin)
      this.rides.delete(id)
    }
  }
}

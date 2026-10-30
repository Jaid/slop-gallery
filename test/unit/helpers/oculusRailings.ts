import RAPIER from '@dimforge/rapier3d-compat'

import OculusRailing from '../../../src/lib/gallery/railings/OculusRailing.ts'
import OculusSwitchbackRailing from '../../../src/lib/gallery/railings/OculusSwitchbackRailing.ts'

/** the rails round the tower’s deck, its ramp and its bridges: west, south and east */
export const oculusRailings = (['west', 'south', 'east'] as const).map(run => new OculusRailing(run))

export function addOculusRailings(world: RAPIER.World) {
  for (const path of [...oculusRailings, new OculusSwitchbackRailing('west'), new OculusSwitchbackRailing('east')]) {
    for (const segment of path.segments) {
      const [x, y, z, w] = segment.rotation
      world.createCollider(RAPIER.ColliderDesc.capsule(segment.halfLength, path.radius).setTranslation(...segment.position).setRotation({
        x,
        y,
        z,
        w,
      }))
    }
    for (const post of path.posts) {
      world.createCollider(RAPIER.ColliderDesc.cuboid(path.postRadius, post.height / 2, path.postRadius).setTranslation(...post.position))
    }
  }
}

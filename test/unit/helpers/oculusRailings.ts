import RAPIER from '@dimforge/rapier3d-compat'

import OculusRailing from '../../../src/lib/gallery/railings/OculusRailing.ts'
import OculusSwitchbackRailing from '../../../src/lib/gallery/railings/OculusSwitchbackRailing.ts'

export const oculusRailing = new OculusRailing

export function addOculusRailings(world: RAPIER.World) {
  for (const path of [oculusRailing, new OculusSwitchbackRailing('west'), new OculusSwitchbackRailing('east')]) {
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

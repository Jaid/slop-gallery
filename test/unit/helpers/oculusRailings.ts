import RAPIER from '@dimforge/rapier3d-compat'

import {OculusRailing} from '../../../src/lib/gallery/railings/OculusRailing.ts'

export const oculusRailing = new OculusRailing

export function addOculusRailings(world: RAPIER.World) {
  for (const segment of oculusRailing.segments) {
    const [x, y, z, w] = segment.rotation
    world.createCollider(RAPIER.ColliderDesc.capsule(segment.halfLength, oculusRailing.radius).setTranslation(...segment.position).setRotation({
      x,
      y,
      z,
      w,
    }))
  }
  for (const post of oculusRailing.posts) {
    world.createCollider(RAPIER.ColliderDesc.cuboid(oculusRailing.postRadius, post.height / 2, oculusRailing.postRadius).setTranslation(...post.position))
  }
}

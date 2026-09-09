import RAPIER from '@dimforge/rapier3d-compat'

import {GlasswellRailing} from '../../../src/lib/gallery/railings/GlasswellRailing.ts'

export const glasswellRailing = new GlasswellRailing

export function addGlasswellRailings(world: RAPIER.World) {
  for (const segment of glasswellRailing.segments) {
    const [x, y, z, w] = segment.rotation
    world.createCollider(RAPIER.ColliderDesc.capsule(segment.halfLength, glasswellRailing.radius).setTranslation(...segment.position).setRotation({
      x,
      y,
      z,
      w,
    }))
  }
  for (const post of glasswellRailing.posts) {
    world.createCollider(RAPIER.ColliderDesc.cuboid(glasswellRailing.postRadius, post.height / 2, glasswellRailing.postRadius).setTranslation(...post.position))
  }
}

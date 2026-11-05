import RAPIER from '@dimforge/rapier3d-compat'

import {colliderGeometry} from '../../../src/lib/gallery/architecture.ts'
import {bastionCrater} from '../../../src/lib/gallery/bastion.ts'
import BastionCraterGeometry from '../../../src/lib/gallery/BastionCraterGeometry.ts'
import {weldedSurfaceSkin} from '../../../src/lib/physics/weldedSurface.ts'

/** the tipped flags, the rubble and the shards of the Bastion’s crater, in its own frame */
export const bastionCraterGeometry = new BastionCraterGeometry
const collision = [bastionCraterGeometry.flags, bastionCraterGeometry.rubble, bastionCraterGeometry.shards].map(colliderGeometry)

/** Adds what the game adds round the hole in the curve’s paving: the crater’s tipped flags, rubble and shards as welded surfaces with their skin, in its own frame. */
export function addBastionCrater(world: RAPIER.World) {
  for (const [vertices, indices] of collision) {
    world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices, RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES).setContactSkin(weldedSurfaceSkin).setTranslation(...bastionCrater.center))
  }
}

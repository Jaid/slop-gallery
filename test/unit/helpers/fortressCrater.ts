import RAPIER from '@dimforge/rapier3d-compat'

import {colliderGeometry} from '../../../src/lib/gallery/architecture.ts'
import {fortressCrater} from '../../../src/lib/gallery/fortress.ts'
import FortressCraterGeometry, {guardStoneHull} from '../../../src/lib/gallery/FortressCraterGeometry.ts'

/** the tipped flags, the rubble and the shards of the Fortress’ crater, in its own frame */
export const fortressCraterGeometry = new FortressCraterGeometry
const collision = [fortressCraterGeometry.flags, fortressCraterGeometry.rubble, fortressCraterGeometry.shards].map(colliderGeometry)

/** Adds what the game adds round the hole in the curve’s paving: the crater’s tipped flags, rubble and shards as welded surfaces, and the guard stone in the link’s doorway. */
export function addFortressCrater(world: RAPIER.World) {
  for (const [vertices, indices] of collision) {
    world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices, RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES).setTranslation(...fortressCrater.center))
  }
  world.createCollider(RAPIER.ColliderDesc.convexHull(guardStoneHull())!)
}

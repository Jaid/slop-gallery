import type {OrbGlassOptions} from '#src/lib/materials/orb/base/OrbGlassMaterial.ts'

import ClearOrbMaterial from '#src/lib/materials/orb/ClearOrbMaterial.ts'

import Orb from '../base/Orb.ts'

/**
 * A ball of clear crystal with nothing inside, which registers nothing as an ingredient: no prompt, no image and no frame. Thrown into a work, it leaves the fusion nothing to merge the work with, so no image model is asked and the work comes back out of the portal as it went in, framed by the room it arrives in.
 * It is for trying the fusion’s animation and for resetting a work’s frame to its room’s.
 */
export default class TransparentOrb extends Orb {
  readonly id = 'transparent'
  readonly title = 'Transparent Orb'

  createMaterial(options: OrbGlassOptions) {
    return new ClearOrbMaterial(options)
  }
}

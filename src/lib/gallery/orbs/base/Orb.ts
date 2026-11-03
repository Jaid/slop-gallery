import type {FrameChoice} from '#src/lib/frames/frameChoice.ts'
import type {IngredientRegistration} from '#src/lib/gallery/fusion/FusionRecipe.ts'
import type OrbGlassMaterial from '#src/lib/materials/orb/base/OrbGlassMaterial.ts'
import type {OrbGlassOptions} from '#src/lib/materials/orb/base/OrbGlassMaterial.ts'
import type {Mood} from '#src/lib/moods/index.ts'

import {pickFrame} from '#src/lib/frames/frameChoice.ts'

/**
 * A kind of orb: a glass ball, which brings whatever it registers into the fusion of a work it is thrown into instead of a studio photograph of itself, and which a success uses up.
 * Its prop is `prop-orb-<id>`, and it lives in a folder of its own.
 */
export default abstract class Orb {
  /** the frame a work it is thrown into comes out of the portal in, wherever that is, or several, of which every game picks one; without one, the room the work arrives in frames it */
  readonly frame?: FrameChoice
  abstract readonly id: string
  /** what comes over the world while the player holds the orb, if anything */
  readonly mood?: Mood
  abstract readonly title: string

  get propId() {
    return `prop-orb-${this.id}`
  }

  /** the glass with whatever the orb holds inside, for a ball of the given radius */
  abstract createMaterial(options: OrbGlassOptions): OrbGlassMaterial

  /** what the orb brings into the fusion of a work it is thrown into, in the environment of `seed`: its frame, if it has one */
  ingredient(seed: number): IngredientRegistration {
    return this.frame ? {frame: pickFrame(seed, this.frame)} : {}
  }
}

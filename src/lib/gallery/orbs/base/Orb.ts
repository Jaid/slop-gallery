import type OrbGlassMaterial from '#src/lib/materials/orb/base/OrbGlassMaterial.ts'
import type {OrbGlassOptions} from '#src/lib/materials/orb/base/OrbGlassMaterial.ts'

import {environmentSample} from '../../../environmentSeed.ts'

/**
 * A kind of orb: a glass ball filled with a scene of its own, which reworks a work it is thrown into by its prompt instead of merging it with a photograph of itself.
 * Its prop is `prop-orb-<id>`.
 */
export default abstract class Orb {
  /** how many of its adjectives a prompt names */
  readonly adjectiveCount: number = 5
  /** what the prompt describes the reworked work by, of which the environment seed picks {@link adjectiveCount} */
  abstract readonly adjectives: ReadonlyArray<string>
  /** what the image model is asked to do to the work, leading into the adjectives */
  abstract readonly change: string
  /** the orb’s glow, which tints the work instead when the merge is made locally, without AI, and the portal of the merge */
  abstract readonly color: string
  abstract readonly id: string
  /** the opening sentence of the prompt, which sets the scene for the image model */
  abstract readonly premise: string
  abstract readonly title: string

  get propId() {
    return `prop-orb-${this.id}`
  }

  /** the glass with the orb’s scene inside, for a ball of the given radius */
  abstract createMaterial(options: OrbGlassOptions): OrbGlassMaterial

  /** the orb’s whole instruction to the image model in the environment of `seed`, sent verbatim along with the work */
  prompt(seed: number) {
    const adjectives = environmentSample(seed, `${this.id}-orb`, this.adjectives, this.adjectiveCount)
    return `${this.premise}\n\nPlease edit this image and ${this.change} ${adjectives.slice(0, -1).join(', ')} or ${adjectives.at(-1)}.`
  }
}

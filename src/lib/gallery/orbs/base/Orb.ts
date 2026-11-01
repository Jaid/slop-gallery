import type OrbGlassMaterial from '#src/lib/materials/orb/base/OrbGlassMaterial.ts'
import type {OrbGlassOptions} from '#src/lib/materials/orb/base/OrbGlassMaterial.ts'
import type {Mood} from '#src/lib/moods/index.ts'

import {environmentPick, environmentSample} from '../../../environmentSeed.ts'

/**
 * A kind of orb: a glass ball filled with a scene of its own, which reworks a work it is thrown into by its prompt instead of merging it with a photograph of itself.
 * Its prop is `prop-orb-<id>`.
 */
export default abstract class Orb {
  /** how many of its adjectives a prompt may name, one of which the environment seed picks */
  readonly adjectiveCounts: ReadonlyArray<number> = [3, 4, 5]
  /**
   * what the prompt describes the reworked work by, ordered so that neighboring adjectives in a prompt belong together; the environment seed picks as many entries as it picked of {@link adjectiveCounts}
   * Synonyms share an entry, of which a prompt names at most one.
   */
  abstract readonly adjectives: ReadonlyArray<ReadonlyArray<string> | string>
  /** what the image model is asked to do to the work, leading into the adjectives */
  abstract readonly change: string
  /** the orb’s glow, which tints the work instead when the merge is made locally, without AI, and the portal of the merge */
  abstract readonly color: string
  abstract readonly id: string
  /** what comes over the world while the player holds the orb */
  abstract readonly mood: Mood
  /** the opening sentence of the prompt, which sets the scene for the image model */
  abstract readonly premise: string
  abstract readonly title: string

  get propId() {
    return `prop-orb-${this.id}`
  }

  /** the glass with the orb’s scene inside, for a ball of the given radius */
  abstract createMaterial(options: OrbGlassOptions): OrbGlassMaterial

  /** the orb’s whole instruction to the image model in the environment of `seed`, sent verbatim along with the work: its premise and change, then 3 to 5 of its adjectives in their listed order, never two synonyms */
  prompt(seed: number) {
    const count = environmentPick(seed, `${this.id}-orb:count`, this.adjectiveCounts)
    const entries = environmentSample(seed, `${this.id}-orb:adjectives`, this.adjectives, count)
    const adjectives = entries.map(entry => (typeof entry === 'string' ? entry : environmentPick(seed, `${this.id}-orb:synonym:${entry[0]}`, entry)))
    return `${this.premise}\n\nPlease edit this image and ${this.change} ${adjectives.slice(0, -1).join(', ')} or ${adjectives.at(-1)}.`
  }
}

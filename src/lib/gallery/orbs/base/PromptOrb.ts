import type {FrameChoice} from '#src/lib/frames/frameChoice.ts'
import type {IngredientRegistration} from '#src/lib/gallery/fusion/FusionRecipe.ts'
import type {Mood} from '#src/lib/moods/index.ts'

import {environmentPick, environmentSample} from '../../../environmentSeed.ts'
import Orb from './Orb.ts'

/** An orb filled with a scene of its own, which reworks a work it is thrown into by its prompt and frames it in its own frame, while the fusion’s portal shows its photograph, which lies in the orb’s folder. */
export default abstract class PromptOrb extends Orb {
  /** how many of its adjectives a prompt may name, one of which the environment seed picks */
  readonly adjectiveCounts: ReadonlyArray<number> = [3, 4, 5]
  /**
   * what the prompt describes the reworked work by, ordered so that neighboring adjectives in a prompt belong together; the environment seed picks as many entries as it picked of {@link adjectiveCounts}
   * Synonyms share an entry, of which a prompt names at most one.
   */
  abstract readonly adjectives: ReadonlyArray<ReadonlyArray<string> | string>
  /** what the image model is asked to do to the work, leading into the adjectives */
  abstract readonly change: string
  /** the orb’s glow, which tints the portal of the fusion and the work instead when the result is made locally, without AI */
  abstract readonly color: string
  abstract override readonly frame: FrameChoice
  abstract override readonly mood: Mood
  /** the URL of an image of it, which the portal of its fusion shows; made in advance, as its glass takes seconds to compile for the studio a thrown prop is photographed in */
  abstract readonly photo: string
  /** the opening sentence of the prompt, which sets the scene for the image model */
  abstract readonly premise: string

  /** its prompt, its glow, its photograph to show in the portal and its frame */
  override ingredient(seed: number): IngredientRegistration {
    return {
      ...super.ingredient(seed),
      color: this.color,
      instruction: this.prompt(seed),
      look: this.photo,
    }
  }

  /** the orb’s whole instruction to the image model in the environment of `seed`, sent verbatim along with the work: its premise and change, then 3 to 5 of its adjectives in their listed order, never two synonyms */
  prompt(seed: number) {
    const count = environmentPick(seed, `${this.id}-orb:count`, this.adjectiveCounts)
    const entries = environmentSample(seed, `${this.id}-orb:adjectives`, this.adjectives, count)
    const adjectives = entries.map(entry => (typeof entry === 'string' ? entry : environmentPick(seed, `${this.id}-orb:synonym:${entry[0]}`, entry)))
    return `${this.premise}\n\nPlease edit this image and ${this.change} ${adjectives.slice(0, -1).join(', ')} or ${adjectives.at(-1)}.`
  }
}

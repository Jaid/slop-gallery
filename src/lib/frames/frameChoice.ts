import type {PortraitFrameId} from './frameParameter.ts'

import {environmentPick} from '#src/lib/environmentSeed.ts'

/** the frames a room or a fusion ingredient brings: one, or several, of which a game wears only one, see {@link pickFrame} */
export type FrameChoice = PortraitFrameId | ReadonlyArray<PortraitFrameId>

/** Every frame of the choice. */
export function choiceFrames(choice: FrameChoice): ReadonlyArray<PortraitFrameId> {
  return typeof choice === 'string' ? [choice] : choice
}

/** The one frame of the choice the game of `seed` wears, the same all game long: drawn by the seed among the frames of a choice of several, each choice drawing its own. */
export function pickFrame(seed: number, choice: FrameChoice): PortraitFrameId {
  return typeof choice === 'string' ? choice : environmentPick(seed, `frame:${choice.join(',')}`, choice)
}

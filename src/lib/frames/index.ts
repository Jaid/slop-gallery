import type PortraitFrame from './base/PortraitFrame.ts'
import type {PortraitFrameId} from './frameParameter.ts'

import ClassicFrame from './ClassicFrame.ts'
import {readFrame} from './frameParameter.ts'
import LobbyLouisFrame from './LobbyLouisFrame.ts'

/** the frame of every work whose room has none of its own */
export const classicFrame = new ClassicFrame
/** every frame there is by its id */
export const frames = {
  classic: classicFrame,
  'lobby-louis': new LobbyLouisFrame,
} as const satisfies Record<PortraitFrameId, PortraitFrame>

const forcedFrameId = readFrame()

/** the frame `?frame` makes every work wear instead of its own, read once at startup, or undefined */
export const forcedFrame: PortraitFrame | undefined = forcedFrameId ? frames[forcedFrameId] : undefined

/** The frame a work wears: the one `?frame` forces on every work, or else the one with the id, the default frame for none. */
export function portraitFrame(id?: PortraitFrameId): PortraitFrame {
  return forcedFrame ?? (id === undefined ? classicFrame : frames[id])
}

export type {PortraitFrameId} from './frameParameter.ts'

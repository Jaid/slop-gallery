import type PortraitFrame from './base/PortraitFrame.ts'
import type {PortraitFrameId} from './frameParameter.ts'

import AntechamberAdamFrame from './AntechamberAdamFrame.ts'
import BanquetPerspectiveFrame from './BanquetPerspectiveFrame.ts'
import ClassicFrame from './ClassicFrame.ts'
import {readFrame} from './frameParameter.ts'
import LobbyLouisFrame from './LobbyLouisFrame.ts'
import SiennaVelvetFrame from './SiennaVelvetFrame.ts'
import VesperRippleFrame from './VesperRippleFrame.ts'

/** the frame of every work whose room has none of its own */
export const classicFrame = new ClassicFrame
/** every frame there is by its id */
export const frames = {
  classic: classicFrame,
  'lobby-louis': new LobbyLouisFrame,
  'vesper-ripple': new VesperRippleFrame,
  'banquet-perspective': new BanquetPerspectiveFrame,
  'antechamber-adam': new AntechamberAdamFrame,
  'sienna-velvet': new SiennaVelvetFrame,
} as const satisfies Record<PortraitFrameId, PortraitFrame>

const forcedFrameId = readFrame()

/** the frame `?frame` makes every work wear instead of its own, read once at startup, or undefined */
export const forcedFrame: PortraitFrame | undefined = forcedFrameId ? frames[forcedFrameId] : undefined

/** The frame a work wears: the one `?frame` forces on every work, or else the one with the id, the default frame for none. */
export function portraitFrame(id?: PortraitFrameId): PortraitFrame {
  return forcedFrame ?? (id === undefined ? classicFrame : frames[id])
}

export type {PortraitFrameId} from './frameParameter.ts'

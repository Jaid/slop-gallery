import type {Portrait, PortraitRatio, PortraitSlot} from '../gallery/types.ts'

/** width per height of each slot ratio */
export const portraitRatios: Record<PortraitRatio, number> = {
  '1:1': 1,
  '2:3': 2 / 3,
  '3:2': 3 / 2,
}

/** the longer frame edges, in meters, that slots come in */
export const slotSizes = [0.9, 1.3, 1.8, 2.4, 3] as const

/** Frame width and height of a ratio at a size. */
export function slotFrame(ratio: PortraitRatio, size: number) {
  const aspect = portraitRatios[ratio]
  return {
    width: aspect >= 1 ? size : size * aspect,
    height: aspect >= 1 ? size / aspect : size,
  }
}

/** A slot as a hung work, for clearance checks against works and other slots. */
export function asPortrait(slot: PortraitSlot): Portrait {
  return {
    id: slot.id,
    title: '',
    creator: '',
    description: '',
    source: '',
    position: slot.position,
    rotation: slot.rotation,
    width: slot.width,
    height: slot.height,
    hung: true,
    wallId: slot.wallId,
    labelAbove: slot.labelAbove,
  }
}


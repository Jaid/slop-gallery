import type {Vec3} from './types.ts'

// A full-width landing keeps the first riser clear of the upper doorway trim.
export const staircase = {
  startX: 4,
  endX: 12,
  z: 11.5,
  width: 2.6,
  topY: 0,
  bottomY: -3.6,
  landing: 0.8,
  count: 20,
} as const
export const stairRise = (staircase.topY - staircase.bottomY) / staircase.count
export const stairRun = (staircase.endX - staircase.startX - staircase.landing) / staircase.count
export const stairBlocks: Array<{position: Vec3
  size: Vec3
  top: number}> = Array.from({length: staircase.count + 1}, (_, i) => {
  const top = staircase.topY - i * stairRise
  const width = i === 0 ? staircase.landing : stairRun
  const x = i === 0 ? staircase.startX + width / 2 : staircase.startX + staircase.landing + (i - 0.5) * stairRun
  const bottom = staircase.bottomY - 0.3
  return {
    position: [x, (top + bottom) / 2, staircase.z],
    size: [width, top - bottom, staircase.width],
    top,
  }
})

export function stairFloorHeight(x: number) {
  const index = Math.min(staircase.count, Math.max(0, Math.floor((x - staircase.startX - staircase.landing) / stairRun) + 1))
  return staircase.topY - index * stairRise
}

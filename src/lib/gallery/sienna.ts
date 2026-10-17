import type {PlankOptions} from '../materials/PlankMaterial.ts'
import type {Wall} from './walls.ts'

export const siennaRugSize = [4.8, 7.2] as const
/** pile and backing together, in meters */
export const siennaRugThickness = 0.016

/** Dark timber joists under the ceiling, spanning the room’s depth. */
export const siennaCeilingBeam = {
  count: 4,
  width: 0.18,
  height: 0.3,
  centerY: 5.56,
}

/**
 * Joist offsets from the room center along its width, one per equal bay with half a bay to each wall.
 * The count is even so the middle bay stays clear for the chandelier’s canopy and stem.
 */
export function siennaCeilingBeamOffsets(roomWidth: number) {
  const {count} = siennaCeilingBeam
  return Array.from({length: count}, (_, i) => (i + 0.5) * roomWidth / count - roomWidth / 2)
}

/** Centers of the 2 m wainscot panels along a wall, skipping any that would run into an opening. */
export function siennaWainscot(wall: Pick<Wall, 'holes' | 'width'>) {
  return Array.from({length: Math.floor(wall.width / 2)}, (_, i) => i * 2 - wall.width / 2 + 1).filter(u => !wall.holes?.some(hole => Math.abs(u - hole.u) < hole.width / 2 + 1))
}

/** Narrow, dark-stained boards between the joists. */
export const siennaCeilingPlanks: PlankOptions = {
  axis: 'z',
  width: 0.12,
  length: [2.2, 3.8],
  figure: {
    meander: 3,
    rings: 120,
  },
  knots: 0.05,
  bevel: 0.004,
  seam: 0.003,
  seed: 29,
  roughness: 0.7,
  envMapIntensity: 0.2,
  colors: {
    dark: '#2a160c',
    light: '#4a2c1a',
    ring: '#1c0e06',
    seam: '#0c0603',
  },
}

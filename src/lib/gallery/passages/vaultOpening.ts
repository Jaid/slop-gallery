import {wallFace} from '../architectureDimensions.ts'

/**
 * The opening through a wall across the end of a stone-vaulted passage `width` wide between its walls’ center lines and `crown` high: between its walls’ faces and up under its barrel, which springs behind them, so the passage runs on through the wall without a step.
 */
export default function vaultOpening(width: number, crown: number) {
  const radius = width / 2
  const half = radius - wallFace
  return {
    width: half * 2,
    height: crown,
    // as high as the barrel rises over the faces
    rise: radius - Math.sqrt(radius ** 2 - half ** 2),
    profile: 'arch',
  } as const
}

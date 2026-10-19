import type {Vec3} from '../types.ts'

import fountain from './config.ts'

export const fountainBench = {
  width: 2.8,
  depth: 0.8,
  height: 0.5,
  radius: 4,
  slats: 6,
  slatGap: 0.025,
} as const

/** The two benches that face the fountain’s flat sides. The side benches were removed. */
export const fountainBenches = [0, Math.PI].map(angle => ({
  position: [fountain.position[0] + Math.sin(angle) * fountainBench.radius, fountain.position[1], fountain.position[2] + Math.cos(angle) * fountainBench.radius] as Vec3,
  rotation: [0, angle, 0] as Vec3,
}))

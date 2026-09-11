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

export const fountainBenches = Array.from({length: 4}, (_, i) => {
  const angle = i * Math.PI / 2
  return {
    position: [fountain.position[0] + Math.sin(angle) * fountainBench.radius, fountain.position[1], fountain.position[2] + Math.cos(angle) * fountainBench.radius] as Vec3,
    rotation: [0, angle, 0] as Vec3,
  }
})

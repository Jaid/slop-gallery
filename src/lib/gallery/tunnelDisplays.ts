import type {Vec3} from './types.ts'

import {lowerGallery} from './lowerGallery.ts'

const {tunnel, floorY} = lowerGallery
export const tunnelDisplayWindow = {
  bottom: 0.55,
  top: 2.85,
  width: tunnel.southZ - tunnel.northZ - 4.5,
  glassThickness: 0.06,
}
const centerZ = (tunnel.northZ + tunnel.southZ) / 2
const depth = 3.2
const thickness = 0.18
export type DisplayBox = {position: Vec3
  size: Vec3}
export const tunnelDisplays = (['west', 'east'] as const).map((side, index) => {
  const direction = side === 'west' ? -1 : 1
  const frontX = tunnel.x + direction * tunnel.width / 2
  const backX = frontX + direction * depth
  const centerX = (frontX + backX) / 2
  const width = tunnelDisplayWindow.width
  const shell: Array<DisplayBox> = [
    {
      position: [centerX, floorY - thickness / 2, centerZ],
      size: [depth, thickness, width],
    },
    {
      position: [centerX, floorY + tunnel.height + thickness / 2, centerZ],
      size: [depth, thickness, width],
    },
    {
      position: [backX + direction * thickness / 2, floorY + tunnel.height / 2, centerZ],
      size: [thickness, tunnel.height, width],
    },
    ...[-1, 1].map(end => ({
      position: [centerX, floorY + tunnel.height / 2, centerZ + end * (width + thickness) / 2] as Vec3,
      size: [depth, tunnel.height, thickness] as Vec3,
    })),
  ]
  return {
    side,
    frontX,
    center: [centerX, centerZ] as const,
    size: [depth, width] as const,
    shell,
    exhibits: [-1, 0, 1].map((slot, i) => ({
      id: `tunnel-${side}-exhibit-${i}`,
      kind: (index * 3 + i) as 0 | 1 | 2 | 3 | 4 | 5,
      position: [centerX, floorY, centerZ + slot * width / 3] as Vec3,
    })),
  }
})

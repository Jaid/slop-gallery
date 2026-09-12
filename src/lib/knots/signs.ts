import type {Vec3} from '../gallery/types.ts'
import type {KnotExhibit} from './exhibition.ts'

export type SignPart = {position: Vec3
  rotation?: Vec3
  size: Vec3}

export const knotSign = {
  width: 1.45,
  height: 0.6,
  elevation: 0.75,
  thickness: 0.024,
}

// Coordinates are relative to the printed face, with supports extending behind it.
export const knotSignParts: Array<SignPart> = [
  {
    position: [0, 0, -knotSign.thickness / 2],
    size: [knotSign.width, knotSign.height, knotSign.thickness],
  },
  {
    position: [0, -0.45, -0.05],
    size: [0.055, 0.6, 0.055],
  },
  {
    position: [0, -0.735, -0.05],
    size: [0.32, 0.03, 0.28],
  },
]

export function knotSignPosition(exhibit: Pick<KnotExhibit, 'position' | 'rotation'>): Vec3 {
  return [exhibit.position[0] + Math.sin(exhibit.rotation) * 0.8, knotSign.elevation, exhibit.position[2] + Math.cos(exhibit.rotation) * 0.8]
}

export function billboardParts(width: number, height: number): Array<SignPart> {
  const legX = width * 0.34
  const top = height / 2
  const legHeight = 1.5 + top
  const braceHeight = Math.min(height * 0.65, 1.2)
  const braceWidth = legX * 2
  return [
    {
      position: [0, 0, -0.025],
      size: [width, height, 0.05],
    },
    ...[-legX, legX].flatMap(x => [
      {
        position: [x, top - legHeight / 2, -0.13] as Vec3,
        size: [0.12, legHeight, 0.16] as Vec3,
      },
      {
        position: [x, -1.44, -0.13] as Vec3,
        size: [0.2, 0.12, 0.85] as Vec3,
      },
    ]),
    ...[-1, 1].map(direction => ({
      position: [0, 0, -0.25] as Vec3,
      rotation: [0, 0, direction * Math.atan2(braceHeight, braceWidth)] as Vec3,
      size: [Math.hypot(braceWidth, braceHeight), 0.09, 0.08] as Vec3,
    })),
  ]
}

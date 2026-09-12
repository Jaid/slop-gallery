import type {Vec3} from '../gallery/types.ts'
import type {KnotExhibit} from './exhibition.ts'

export type SignPart = {position: Vec3
  rotation?: Vec3
  size: Vec3}

export const knotSign = {
  width: 0.85,
  height: 0.85 * 2 / 3,
  elevation: 0.8,
  thickness: 0.018,
  plateMass: 0.8,
  tilt: -Math.PI / 4,
  sideOffset: -1,
  inwardRotation: -Math.PI / 8,
  frontOffset: 0.7,
}

// The stand origin is the plaque's center; only the plaque tilts, not the stem.
export const knotSignParts: Array<SignPart> = [
  {
    position: [0, Math.sin(knotSign.tilt) * knotSign.thickness / 2, -Math.cos(knotSign.tilt) * knotSign.thickness / 2],
    rotation: [knotSign.tilt, 0, 0],
    size: [knotSign.width + 0.024, knotSign.height + 0.024, knotSign.thickness],
  },
]

export const knotSignRoundParts = [
  {
    position: [0, -knotSign.elevation / 2, -0.03] as Vec3,
    radius: 0.018,
    mass: 0.2,
    height: knotSign.elevation,
  },
  {
    position: [0, -knotSign.elevation + 0.014, -0.03] as Vec3,
    radius: 0.2,
    mass: 2.5,
    height: 0.028,
  },
]

export function knotSignPosition(exhibit: Pick<KnotExhibit, 'position' | 'rotation'>): Vec3 {
  const sine = Math.sin(exhibit.rotation)
  const cosine = Math.cos(exhibit.rotation)
  return [exhibit.position[0] + cosine * knotSign.sideOffset + sine * knotSign.frontOffset, knotSign.elevation, exhibit.position[2] - sine * knotSign.sideOffset + cosine * knotSign.frontOffset]
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

export const knotSignId = (id: string) => `prop-knot-sign-${id}`

import type {Vec3} from '../gallery/types.ts'

/** Two taut chains share a ceiling hinge axis; the complete sign swings as one pendulum. */
export const knotModelSign = {
  size: [4.8, 1.15, 0.075] as Vec3,
  anchor: [0, 1.5, 0] as Vec3,
  axis: [1, 0, 0] as Vec3,
  limits: [-0.6, 0.6] as [number, number],
  ceilingInset: 0.12,
  suspensionX: [-1.65, 1.65],
  mass: 12,
  suspensionMass: 0.08,
  angularDamping: 0.65,
  linearDamping: 0.3,
}
export const modelSignSuspension = {
  top: knotModelSign.anchor[1],
  bottom: knotModelSign.size[1] / 2,
}
export const modelSignSuspensionHeight = modelSignSuspension.top - modelSignSuspension.bottom
export const modelSignSuspensionCenter = (modelSignSuspension.top + modelSignSuspension.bottom) / 2

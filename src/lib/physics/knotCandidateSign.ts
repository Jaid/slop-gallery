import type {Vec3} from '../gallery/types.ts'

/** Two taut chains share a ceiling hinge axis; the complete sign swings as one pendulum. */
export const knotCandidateSign = {
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
export const candidateSignSuspension = {
  top: knotCandidateSign.anchor[1],
  bottom: knotCandidateSign.size[1] / 2,
}
export const candidateSignSuspensionHeight = candidateSignSuspension.top - candidateSignSuspension.bottom
export const candidateSignSuspensionCenter = (candidateSignSuspension.top + candidateSignSuspension.bottom) / 2

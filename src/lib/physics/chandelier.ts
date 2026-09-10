/** A freely suspended fixture, not a scripted collision animation. */
export const chandelierPhysics = {
  height: 3.55,
  anchor: [0, 2.05, 0] as [number, number, number],
  angularDamping: 0.42,
  linearDamping: 0.1,
  armMass: 0.3,
  hubMass: 1.5,
  stemMass: 0.25,
  ringMass: 0.02,
  pendantMass: 0.08,
}

export const chandelierStem = {
  top: chandelierPhysics.anchor[1] + 0.05,
  bottom: 0.1,
}
export const chandelierStemHalfHeight = (chandelierStem.top - chandelierStem.bottom) / 2
export const chandelierStemCenter = (chandelierStem.top + chandelierStem.bottom) / 2

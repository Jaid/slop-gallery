/** A freely suspended fixture, not a scripted collision animation. */
export const chandelierPhysics = {
  height: 3.55,
  anchor: [0, 2.05, 0] as [number, number, number],
  angularDamping: 0.42,
  linearDamping: 0.1,
  armMass: 0.3,
  hubMass: 1.5,
  stemMass: 0.25,
  /** the brass rod a fixture may hang from instead of a canopy fixed to the ceiling, light like the stem, so the fixture swings much as it does from the canopy */
  rodMass: 0.25,
  /** each of the turnings along such a rod */
  knopMass: 0.06,
  ringMass: 0.02,
  pendantMass: 0.08,
}

/** the top of the canopy over the fixture, which a rod it hangs from instead starts from */
export const chandelierCanopyTop = chandelierPhysics.anchor[1] + 0.08

/** the brass rod a fixture may hang from: its radius and the ball at its top, round the point it swings about */
export const chandelierRod = {
  radius: 0.014,
  swivel: 0.026,
} as const

/** the height of the chandelier’s lamp above the floor while it hangs at rest, below the metalwork, so the fixture cannot shadow its own source */
export const chandelierLampY = chandelierPhysics.height - 0.5

const chandelierStem = {
  top: chandelierPhysics.anchor[1] + 0.05,
  bottom: 0.1,
}
export const chandelierStemHalfHeight = (chandelierStem.top - chandelierStem.bottom) / 2
export const chandelierStemCenter = (chandelierStem.top + chandelierStem.bottom) / 2

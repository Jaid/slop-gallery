/** A closed architectural entrance; the exterior is deliberately not part of the gallery. */
const mainEntrance = {
  width: 3.3,
  height: 4.85,
  spring: 3.2,
  depth: 0.185,
  /** underside of the lobby cornice’s upper band, which the keystone carries */
  keystoneTop: 5.16,
  reservation: {
    u: 0,
    width: 3.9,
    height: 5.05,
    profile: 'arch' as const,
  },
}

export default mainEntrance

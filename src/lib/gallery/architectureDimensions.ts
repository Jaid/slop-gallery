export const wallTop = 5.8
export const wallFace = 0.105
export const wallOpeningTrim = 0.17
/** the bands of a wall’s cornice, the lower one first: how tall each is, how far its front stands out of the wall’s center line and how far its middle lies under the wall’s top, 30 cm under the ceiling */
export const corniceBands = [
  {
    height: 0.1,
    front: 0.28,
    drop: 0.42,
  },
  {
    height: 0.23,
    front: 0.34,
    drop: 0.22,
  },
] as const

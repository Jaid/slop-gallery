const orientations = {
  0: [
    {
      name: 'north',
      rotation: 0,
    }, {
      name: 'south',
      rotation: Math.PI,
    },
  ],
  2: [
    {
      name: 'west',
      rotation: Math.PI / 2,
    }, {
      name: 'east',
      rotation: -Math.PI / 2,
    },
  ],
} as const

/** The inward-facing wall on either side of an axis-aligned passage. */
export function passageOrientation(axis: 0 | 2, side: number) {
  return orientations[axis][side < 0 ? 0 : 1]
}

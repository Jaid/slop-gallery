/**
 * The Antechamber’s dome: a hemisphere rising from a round opening in its flat ceiling, its corners left as flat pendentives.
 * Two rings of round stained-glass windows pierce it and a brass lattice of stars closes the oculus at its crown, so the sun
 * casts colored discs across the walls and floor. Angles are in degrees, lengths in meters.
 */
const antechamberDome = {
  /** a hand’s width short of the walls’ faces, 3.895 m from the room’s center */
  radius: 3.8,
  /** height of the springing above the floor: the top of the 18 cm ceiling slab under the room’s 7 m */
  springY: 7.07,
  /** sphere segments around and up; each spans 2.25° */
  segments: [160, 40] as const,
  /** round windows, each ring evenly spaced around the dome; `radius` is the angle from a window’s center to its rim, `turn` the azimuth of the ring’s first window */
  windows: [
    {
      count: 12,
      elevation: 20,
      radius: 8.5,
      turn: 0,
    },
    {
      count: 12,
      elevation: 43,
      radius: 5,
      turn: 15,
    },
  ],
  /** how far the glass sits inside the shell, so the panes never fight its faces */
  glassInset: 0.01,
  /** elevation above which the crown is open, under the lattice */
  oculus: 63,
  /** how thick the oculus lattice is */
  latticeDepth: 0.05,
}

/** Height of the dome’s crown above the floor. */
export const antechamberDomeCrownY = antechamberDome.springY + antechamberDome.radius

export default antechamberDome

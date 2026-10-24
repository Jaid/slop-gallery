import {ExtrudeGeometry, Path, Shape, SphereGeometry, Vector2} from 'three/webgpu'

const degrees = Math.PI / 180
/**
 * The Antechamber’s dome: a hemisphere rising from a round opening in its flat ceiling, its corners left as flat pendentives.
 * A ring of windows pierces its base and a brass lattice of stars closes the oculus at its crown, so the sun draws patterns
 * across the walls and floor. Angles are in degrees, lengths in meters.
 */
const antechamberDome = {
  /** a hand’s width short of the walls’ faces, 3.895 m from the room’s center */
  radius: 3.8,
  /** height of the springing above the floor: the top of the 18 cm ceiling slab under the room’s 7 m */
  springY: 7.07,
  /** sphere segments around and up; each spans 2.25°, so the windows’ edges fall on them */
  segments: [160, 40] as const,
  windows: {
    count: 16,
    /** angle around the dome that each window spans */
    width: 9,
    /** elevations of the windows’ sills and heads above the springing */
    sill: 6.75,
    head: 31.5,
  },
  /** elevation above which the crown is open, under the lattice */
  oculus: 63,
  /** how thick the oculus lattice is */
  latticeDepth: 0.05,
}

/** Height of the dome’s crown above the floor. */
export const antechamberDomeCrownY = antechamberDome.springY + antechamberDome.radius

/** The dome’s shell around its own center at the springing, without the faces of its windows and oculus. */
export function antechamberDomeGeometry() {
  const {radius, segments} = antechamberDome
  const geometry = new SphereGeometry(radius, segments[0], segments[1], 0, Math.PI * 2, 0, Math.PI / 2)
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()!
  const kept: Array<number> = []
  for (let i = 0; i < index.count; i += 3) {
    const corners = [index.getX(i), index.getX(i + 1), index.getX(i + 2)]
    const [x, y, z] = ['getX', 'getY', 'getZ'].map(axis => corners.reduce((sum, corner) => sum + position[axis as 'getX'](corner), 0) / 3)
    if (!isOpen(Math.atan2(x, z) / degrees + 180, Math.asin(Math.min(1, y / Math.hypot(x, y, z))) / degrees)) {
      kept.push(...corners)
    }
  }
  geometry.setIndex(kept)
  return geometry
}

/** Whether a direction from the dome’s center, by azimuth and elevation, looks through a window or the oculus. */
function isOpen(azimuth: number, elevation: number) {
  const {oculus, windows} = antechamberDome
  if (elevation > oculus) {
    return true
  }
  const spacing = 360 / windows.count
  const offset = Math.abs((azimuth % spacing + spacing * 1.5) % spacing - spacing / 2)
  return elevation > windows.sill && elevation < windows.head && offset < windows.width / 2
}

/** Height of the lattice’s underside above the dome’s springing, where it rests on the rim of the oculus. */
export const antechamberLatticeY = Math.sqrt(antechamberDome.radius ** 2 - latticeRadius() ** 2)

/** A brass disc over the oculus, cut into an eight-pointed star ringed by eight smaller ones and sixteen round lights, lying flat with its underside at y = 0. The pattern is laid out in fractions of the oculus’ radius. */
export function antechamberLatticeGeometry() {
  const open = oculusRadius()
  const disc = new Shape
  disc.absarc(0, 0, latticeRadius(), 0, Math.PI * 2, false)
  disc.holes.push(star(new Path, [0, 0], open * 0.34, open * 0.17, Math.PI / 8))
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4
    disc.holes.push(star(new Path, [Math.cos(angle) * open * 0.61, Math.sin(angle) * open * 0.61], open * 0.145, open * 0.072, angle))
  }
  for (let i = 0; i < 16; i++) {
    const angle = (i + 0.5) * Math.PI / 8
    const light = new Path
    light.absarc(Math.cos(angle) * open * 0.885, Math.sin(angle) * open * 0.885, open * 0.047, 0, Math.PI * 2, true)
    disc.holes.push(light)
  }
  const lattice = new ExtrudeGeometry(disc, {
    bevelEnabled: false,
    curveSegments: 64,
    depth: antechamberDome.latticeDepth,
  })
  return lattice.rotateX(-Math.PI / 2)
}
function latticeRadius() {
  return oculusRadius() + 0.08
}
function oculusRadius() {
  return antechamberDome.radius * Math.cos(antechamberDome.oculus * degrees)
}
function star(path: Path, [x, y]: readonly [number, number], outer: number, inner: number, turn = 0) {
  const points = Array.from({length: 16}, (_, i) => {
    const angle = turn + i * Math.PI / 8
    const distance = i % 2 === 0 ? outer : inner
    return new Vector2(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance)
  })
  path.setFromPoints([...points, points[0]])
  return path
}

export default antechamberDome

import type Node from 'three/src/nodes/core/Node.js'

import {bool, normalize, positionLocal, vec3} from 'three/tsl'
import {ExtrudeGeometry, Path, Shape, SphereGeometry, Vector2, Vector3} from 'three/webgpu'

const degrees = Math.PI / 180
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

/** Unit directions from the dome’s center toward the centers of its windows, with each window’s angular radius in radians and the index of its ring. */
export function antechamberWindows() {
  return antechamberDome.windows.flatMap((ring, ringIndex) => Array.from({length: ring.count}, (_, i) => {
    const azimuth = (ring.turn + i * 360 / ring.count) * degrees
    const elevation = ring.elevation * degrees
    return {
      direction: new Vector3(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation)),
      radius: ring.radius * degrees,
      ring: ringIndex,
    }
  }))
}

/** The dome’s shell around its own center at the springing, without the faces of its oculus and the ones wholly inside a window; {@link antechamberWindowMask} cuts the windows’ round edges. */
export function antechamberDomeGeometry() {
  const {radius, segments} = antechamberDome
  const geometry = new SphereGeometry(radius, segments[0], segments[1], 0, Math.PI * 2, 0, Math.PI / 2)
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()!
  const kept: Array<number> = []
  const windows = antechamberWindows()
  const corner = new Vector3
  const centroid = new Vector3
  for (let i = 0; i < index.count; i += 3) {
    const corners = [index.getX(i), index.getX(i + 1), index.getX(i + 2)]
    centroid.set(0, 0, 0)
    const inWindow = windows.some(window => corners.every(vertex => corner.fromBufferAttribute(position, vertex).normalize().dot(window.direction) > Math.cos(window.radius)))
    for (const vertex of corners) {
      centroid.add(corner.fromBufferAttribute(position, vertex))
    }
    if (!inWindow && Math.asin(Math.min(1, centroid.y / centroid.length())) / degrees <= antechamberDome.oculus) {
      kept.push(...corners)
    }
  }
  geometry.setIndex(kept)
  return geometry
}

/** For the shell’s material: false where a fragment lies inside a window, to be discarded in the color and the shadow passes alike. */
export function antechamberWindowMask() {
  const direction = normalize(positionLocal)
  return antechamberWindows().reduce<Node<'bool'>>((mask, window) => mask.and(direction.dot(vec3(...window.direction)).lessThan(Math.cos(window.radius))), bool(true))
}

/** Where each window’s flat pane sits: its center, the unit normal facing into the dome, its radius, which meets the shell at the window’s rim, and its ring. */
export function antechamberGlassPlacements() {
  const {glassInset, radius} = antechamberDome
  return antechamberWindows().map(window => ({
    center: window.direction.clone().multiplyScalar(radius * Math.cos(window.radius) - glassInset),
    normal: window.direction.clone().negate(),
    radius: radius * Math.sin(window.radius),
    ring: window.ring,
  }))
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

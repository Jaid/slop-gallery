import {BoxGeometry, BufferGeometry, CircleGeometry, ExtrudeGeometry, Float32BufferAttribute, Path, Shape, SphereGeometry, TorusGeometry, Vector3} from 'three/webgpu'

import {circleSegments, mergeParts} from '../geometry.ts'
import lobbyClock, {clockNumerals, gloireRays} from './lobbyClock.ts'
import {roundFrame, roundFrameReach} from './LobbyVaultGeometry.ts'

/** Height of the dial above the lunette’s face, and how far the hands and the boss stand in front of it. */
export const clockLayers = {
  dial: 0.008,
  hour: 0.05,
  minute: 0.082,
  handThickness: 0.02,
  boss: 0.106,
} as const

/** A box between two points of the xy plane, `width` across and standing `depth` proud of z = `z`. */
const stroke = (from: readonly [number, number], to: readonly [number, number], width: number, depth: number, z: number) => {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const box = new BoxGeometry(width, Math.hypot(dx, dy), depth)
  box.rotateZ(Math.atan2(dy, dx) - Math.PI / 2)
  return box.translate((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, z + depth / 2)
}

/**
 * The strokes of a Roman numeral in its own frame: centered on x, its foot at y = 0 and its head at the numeral height. Each
 * letter has one thick and, in V and X, one thin stroke, as cut with a broad pen, and continuous bars run across the head and
 * foot of the whole numeral.
 */
export function numeralStrokes(numeral: string) {
  const {bar, gap, height, letter, overhang, thick, thin} = lobbyClock.numerals
  // Roman numerals are plain ASCII, so splitting into UTF-16 code units splits them into letters.
  const letters = numeral.split('')
  const widths = letters.map(character => (character === 'I' ? thick : letter))
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1)
  const top = height - bar
  const strokes: Array<{
    from: readonly [number, number]
    to: readonly [number, number]
    width: number
  }> = []
  let x = -total / 2
  for (const [i, character] of letters.entries()) {
    const width = widths[i]
    if (character === 'I') {
      strokes.push({
        from: [x + width / 2, bar],
        to: [x + width / 2, top],
        width,
      })
    } else if (character === 'V') {
      // The strokes meet at the foot, each one’s outer edge on the letter’s outline.
      strokes.push({
        from: [x + thick / 2, top],
        to: [x + width / 2, bar],
        width: thick,
      }, {
        from: [x + width - thin / 2, top],
        to: [x + width / 2, bar],
        width: thin,
      })
    } else if (character === 'X') {
      strokes.push({
        from: [x + thick / 2, top],
        to: [x + width - thick / 2, bar],
        width: thick,
      }, {
        from: [x + width - thin / 2, top],
        to: [x + thin / 2, bar],
        width: thin,
      })
    } else {
      throw new RangeError(`The clock’s numerals are written with I, V and X only, not “${character}”.`)
    }
    x += width + gap
  }
  for (const y of [bar / 2, height - bar / 2]) {
    strokes.push({
      from: [-total / 2 - overhang, y],
      to: [total / 2 + overhang, y],
      width: bar,
    })
  }
  return {
    strokes,
    width: total + overhang * 2,
  }
}

/** A flat extrusion of `shape` standing `depth` proud of z = `z`. */
const plate = (shape: Shape, depth: number, z: number, curveSegments = 12) => {
  const geometry = new ExtrudeGeometry(shape, {
    bevelEnabled: false,
    curveSegments,
    depth,
  })
  return geometry.translate(0, 0, z)
}
const disc = (x: number, y: number, radius: number, hole?: number) => {
  const shape = new Shape
  shape.absarc(x, y, radius, 0, Math.PI * 2, false)
  if (hole) {
    const path = new Path
    path.absarc(x, y, hole, 0, Math.PI * 2, true)
    shape.holes.push(path)
  }
  return shape
}

/**
 * A Breguet hand pointing up along +y from its arbor at the origin: a tapering shaft with a short tail, the hollow “pomme”
 * ring near its end and a slim spear tip beyond.
 */
export function breguetHand(length: number, {pomme, shaft, tail}: {
  /** outer radius of the ring */
  pomme: number
  /** width of the shaft at the arbor */
  shaft: number
  tail: number
}) {
  const {handThickness} = clockLayers
  const ringY = length * 0.7
  const ring = pomme * 0.66
  const shapes: Array<Shape> = []
  const body = new Shape
  // The shaft tapers from the tail’s counterweight to the ring, where it ends inside the ring’s hole edge.
  body.moveTo(-shaft * 0.4, -tail)
  body.lineTo(-shaft / 2, 0)
  body.lineTo(-shaft * 0.32, ringY - ring - 0.004)
  body.lineTo(shaft * 0.32, ringY - ring - 0.004)
  body.lineTo(shaft / 2, 0)
  body.lineTo(shaft * 0.4, -tail)
  body.closePath()
  shapes.push(body)
  shapes.push(disc(0, ringY, pomme, ring))
  const tip = new Shape
  tip.moveTo(-shaft * 0.36, ringY + ring + 0.004)
  tip.quadraticCurveTo(-shaft * 0.5, ringY + (length - ringY) * 0.75, 0, length)
  tip.quadraticCurveTo(shaft * 0.5, ringY + (length - ringY) * 0.75, shaft * 0.36, ringY + ring + 0.004)
  tip.closePath()
  shapes.push(tip)
  // The arbor’s collet, hidden under the boss.
  shapes.push(disc(0, 0, shaft * 1.3))
  return mergeParts(shapes.map(shape => plate(shape, handThickness, 0, 40)))
}

/**
 * A gilt ray of the gloire along +x from `start`, chased with a ridge along its middle so its two flanks catch the light
 * differently: a pointed straight wedge, or a flame that waves along its length as it tapers. Its back lies flat on z = 0.
 */
export function gloireRay(start: number, length: number, flame: boolean) {
  const {relief} = lobbyClock.gloire
  const half = flame ? 0.11 : 0.15
  const amplitude = flame ? 0.06 : 0
  const waves = Math.max(1.5, Math.round(length / 0.8 * 2) / 2)
  const steps = flame ? Math.max(16, Math.round(waves * 18)) : 1
  const height = relief
  const middle = (t: number) => Math.sin(t * waves * Math.PI * 2) * amplitude * Math.sqrt(1 - t)
  const positions: Array<number> = []
  const indices: Array<number> = []
  const vertex = (x: number, y: number, z: number) => {
    positions.push(x, y, z)
    return positions.length / 3 - 1
  }
  const corner = (index: number) => {
    const point = new Vector3
    return point.fromArray(positions, index * 3)
  }
  /** Adds a triangle wound so that it faces along `facing`, unless it has no area. */
  const triangle = (a: number, b: number, c: number, facing: Vector3) => {
    const pa = corner(a)
    const normal = corner(b).sub(pa).cross(corner(c).sub(pa))
    if (normal.lengthSq() < 1e-14) {
      return
    }
    indices.push(...normal.dot(facing) > 0 ? [a, b, c] : [a, c, b])
  }
  const front = new Vector3(0, 0, 1)
  // Each flank is its own strip between the outline and the ridge, so the ridge stays a crisp edge.
  for (const side of [-1, 1]) {
    const rows = Array.from({length: steps + 1}, (_, i) => {
      const t = i / steps
      const x = start + t * length
      const y = middle(t)
      return [vertex(x, y + side * half * (1 - t), 0), vertex(x, y, height * (1 - t * 0.85))] as const
    })
    for (let i = 0; i < steps; i++) {
      const [edge, ridge] = rows[i]
      const [nextEdge, nextRidge] = rows[i + 1]
      triangle(edge, nextEdge, nextRidge, front)
      triangle(edge, nextRidge, ridge, front)
    }
  }
  // The root closes the ray where it emerges from behind the frame.
  const root = [vertex(start, middle(0) - half, 0), vertex(start, middle(0), height), vertex(start, middle(0) + half, 0)] as const
  triangle(...root, new Vector3(-1, 0, 0))
  const geometry = new BufferGeometry
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(new Float32Array(positions.length / 3 * 2), 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Merged meshes of the Lobby’s great clock in its own frame (see {@link lobbyClock}), by material: the stone frame, gilding,
 * the enameled dial and the two blued steel hands, each pointing at twelve and turning about the z axis.
 */
export default class LobbyClockGeometry {
  readonly dial: BufferGeometry
  readonly gold: BufferGeometry
  readonly hourHand: BufferGeometry
  readonly minuteHand: BufferGeometry
  readonly stone: BufferGeometry

  constructor() {
    const {chapter, numerals, radius, track} = lobbyClock
    const frame = roundFrame(radius)
    const gold: Array<BufferGeometry> = [...frame.gold]
    const dialZ = clockLayers.dial
    const ring = (size: number, tube: number) => {
      const torus = new TorusGeometry(size, tube, 4, circleSegments(size, 0.003))
      // Half sunk into the enamel, so the ring reads as a raised gilt bead.
      return torus.translate(0, 0, dialZ)
    }
    // The minute track between two beads, with a longer, broader tick every five minutes; a bead also borders the ivory center.
    gold.push(ring(track[0], 0.011), ring(track[1], 0.011), ring(chapter, 0.02))
    for (let i = 0; i < 60; i++) {
      const angle = i * Math.PI / 30
      const major = i % 5 === 0
      const inset = major ? 0.005 : 0.03
      const direction = [Math.sin(angle), Math.cos(angle)] as const
      const from = [direction[0] * (track[0] + inset), direction[1] * (track[0] + inset)] as const
      const to = [direction[0] * (track[1] - inset), direction[1] * (track[1] - inset)] as const
      gold.push(stroke(from, to, major ? 0.05 : 0.016, 0.012, dialZ))
    }
    // Roman numerals stand radially, their feet toward the center, so VI is read upside down.
    for (const [i, numeral] of clockNumerals.entries()) {
      const angle = (i + 1) * Math.PI / 6
      for (const {from, to, width} of numeralStrokes(numeral).strokes) {
        const part = stroke([from[0], from[1] + numerals.base], [to[0], to[1] + numerals.base], width, numerals.relief, dialZ)
        gold.push(part.rotateZ(-angle))
      }
    }
    // A domed gilt boss caps the arbor in front of the hands.
    const boss = new SphereGeometry(0.14, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2)
    gold.push(boss.rotateX(Math.PI / 2).scale(1, 1, 0.55).translate(0, 0, clockLayers.boss))
    // Gilt pearls strung along the crest of the outer archivolt, the clock’s one ornament the rose window lacks.
    const {pearls} = lobbyClock
    const crest = roundFrameReach(radius) - 0.21
    for (let i = 0; i < pearls.count; i++) {
      const angle = (i + 0.5) * Math.PI * 2 / pearls.count
      const pearl = new SphereGeometry(pearls.radius, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2)
      gold.push(pearl.rotateX(Math.PI / 2).translate(crest * Math.cos(angle), crest * Math.sin(angle), 0.12))
    }
    // The gloire: gilt rays fanning out from behind the frame across the lunette.
    for (const ray of gloireRays()) {
      gold.push(gloireRay(lobbyClock.gloire.start, ray.length, ray.flame).rotateZ(ray.angle))
    }
    // The dial sits just proud of the wall, its edge tucked under the gilt ring that lines the frame.
    const dial = new CircleGeometry(radius, circleSegments(radius, 0.004))
    this.dial = mergeParts([dial.translate(0, 0, dialZ)])
    this.stone = mergeParts(frame.stone)
    this.gold = mergeParts(gold)
    this.hourHand = breguetHand(lobbyClock.hands.hour, {
      pomme: 0.19,
      shaft: 0.1,
      tail: 0.16,
    }).translate(0, 0, clockLayers.hour)
    this.minuteHand = breguetHand(lobbyClock.hands.minute, {
      pomme: 0.15,
      shaft: 0.085,
      tail: 0.24,
    }).translate(0, 0, clockLayers.minute)
  }

  dispose() {
    for (const geometry of [this.dial, this.gold, this.hourHand, this.minuteHand, this.stone]) {
      geometry.dispose()
    }
  }
}

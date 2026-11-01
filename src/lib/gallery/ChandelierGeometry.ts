import type {BufferGeometry} from 'three/webgpu'

import {CylinderGeometry, LatheGeometry, QuadraticBezierCurve3, SphereGeometry, SplineCurve, TorusGeometry, TubeGeometry, Vector2, Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {chandelierCanopyTop, chandelierRod, chandelierStemCenter, chandelierStemHalfHeight} from '../physics/chandelier.ts'

/** a turned brass ornament on the rod, its outline from the middle of its foot up round its collars and swelling to the middle of its top, as radius and height over its foot, measured at `size` times its size */
type Turning = {
  outline: ReadonlyArray<readonly [radius: number, height: number]>
  size: number
}

/** a baluster between collars where the rod meets the fixture’s stem, swelling like an urn */
const urn: Turning = {
  outline: [[0, 0], [0.028, 0], [0.042, 0.012], [0.03, 0.028], [0.026, 0.045], [0.05, 0.09], [0.078, 0.14], [0.084, 0.17], [0.074, 0.205], [0.045, 0.245], [0.026, 0.27], [0.024, 0.29], [0.04, 0.305], [0.042, 0.318], [0.028, 0.33], [0.02, 0.35], [0, 0.36]],
  size: 1.6,
}
/** a ball between collars halfway up the rod */
const knop: Turning = {
  outline: [[0, 0], [0.02, 0], [0.034, 0.012], [0.022, 0.03], [0.04, 0.06], [0.058, 0.11], [0.04, 0.16], [0.022, 0.19], [0.034, 0.208], [0.02, 0.22], [0, 0.22]],
  size: 1.5,
}
/** where the urn’s foot sits: over the fixture’s stem, round the rod’s foot */
const urnFoot = chandelierCanopyTop - 0.13
/** The turning at its size, smoothed through its outline, with its foot at `y`. */
function turned({outline, size}: Turning, y: number) {
  const curve = new SplineCurve(outline.map(([radius, height]) => new Vector2(radius * size, height * size)))
  const points = curve.getPoints(outline.length * 6).map(point => new Vector2(Math.max(point.x, 0), point.y))
  const turning = new LatheGeometry(points, 40)
  return turning.translate(0, y, 0)
}
/** How wide a turning gets at its size and how high over its foot. */
function widest({outline, size}: Turning) {
  const [radius, height] = outline.reduce((wide, point) => (point[0] > wide[0] ? point : wide))
  return [radius * size, height * size] as const
}

/**
 * Consolidated by material and shadow behavior, with all eight candle arms retained.
 * Hung from a rod `rod` meters long over the canopy’s top instead of the canopy, its brass takes in the rod, the ball at its top and two turnings along it: an urn where it meets the stem and a ball halfway up.
 */
export default class ChandelierGeometry {
  readonly armColliders: Array<Float32Array> = []
  readonly brass: BufferGeometry
  readonly candles: BufferGeometry
  readonly canopy: CylinderGeometry
  readonly flames: BufferGeometry
  /** the turnings along the rod, as balls round their widest, for colliders; none without a rod */
  readonly knops: ReadonlyArray<{
    radius: number
    y: number
  }>
  readonly pendant: SphereGeometry
  readonly ringColliders: Array<Float32Array> = []

  constructor({rod = 0}: {rod?: number} = {}) {
    const canopy = new CylinderGeometry(0.3, 0.22, 0.12, 32)
    this.canopy = canopy.translate(0, chandelierCanopyTop - 0.06, 0)
    const pendant = new SphereGeometry(0.09, 16, 12)
    this.pendant = pendant.scale(1, 1.4, 1).translate(0, -0.38, 0)
    for (let i = 0; i < 16; i++) {
      const sector = new TorusGeometry(0.66, 0.032, 8, 4, Math.PI / 8)
      sector.rotateZ(i * Math.PI / 8).rotateX(Math.PI / 2).translate(0, -0.12, 0)
      this.ringColliders.push(Float32Array.from(sector.getAttribute('position').array))
      sector.dispose()
    }
    const stem = new CylinderGeometry(0.022, 0.022, chandelierStemHalfHeight * 2, 12)
    const hub = new SphereGeometry(0.19, 24, 16)
    const ring = new TorusGeometry(0.66, 0.032, 8, 64)
    const brass: Array<BufferGeometry> = [
      stem.translate(0, chandelierStemCenter, 0),
      hub.scale(1, 1.5, 1),
      ring.rotateX(Math.PI / 2).translate(0, -0.12, 0),
    ]
    const turnings: Array<[Turning, number]> = []
    if (rod > 0) {
      // From inside the urn up to the middle of the ball at its top.
      const shaft = new CylinderGeometry(chandelierRod.radius, chandelierRod.radius, rod + 0.02, 16)
      const swivel = new SphereGeometry(chandelierRod.swivel, 16, 12)
      brass.push(shaft.translate(0, chandelierCanopyTop + (rod - 0.02) / 2, 0), swivel.translate(0, chandelierCanopyTop + rod, 0))
      turnings.push([urn, urnFoot], [knop, chandelierCanopyTop + rod / 2 - knop.outline.at(-1)![1] * knop.size / 2])
      brass.push(...turnings.map(([outline, y]) => turned(outline, y)))
    }
    this.knops = turnings.map(([outline, y]) => {
      const [radius, height] = widest(outline)
      return {
        radius,
        y: y + height,
      }
    })
    const candles: Array<BufferGeometry> = []
    const flames: Array<BufferGeometry> = []
    const arm = new QuadraticBezierCurve3(new Vector3(0.18, 0, 0), new Vector3(0.8, -0.5, 0), new Vector3(1.25, 0.15, 0))
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4
      const armTube = new TubeGeometry(arm, 20, 0.027, 8, false)
      const dripCup = new CylinderGeometry(0.14, 0.07, 0.08, 24)
      brass.push(armTube.rotateY(angle), dripCup.translate(1.25, 0.17, 0).rotateY(angle))
      const candle = new CylinderGeometry(0.045, 0.055, 0.24, 12)
      candles.push(candle.translate(1.25, 0.32, 0).rotateY(angle))
      // Separate convex arms leave the spaces between them open to thrown objects.
      this.armColliders.push(Float32Array.from([...brass.at(-2)!.getAttribute('position').array, ...brass.at(-1)!.getAttribute('position').array, ...candles.at(-1)!.getAttribute('position').array]))
      const flame = new SphereGeometry(0.07, 12, 8)
      flames.push(flame.scale(0.8, 1.5, 0.8).translate(1.25, 0.51, 0).rotateY(angle))
    }
    this.brass = mergeParts(brass)
    this.candles = mergeParts(candles)
    this.flames = mergeParts(flames)
  }

  dispose() {
    this.brass.dispose()
    this.candles.dispose()
    this.flames.dispose()
    this.pendant.dispose()
    this.canopy.dispose()
  }
}

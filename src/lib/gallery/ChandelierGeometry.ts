import type {BufferGeometry} from 'three/webgpu'

import {CylinderGeometry, QuadraticBezierCurve3, SphereGeometry, TorusGeometry, TubeGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {chandelierPhysics, chandelierStemCenter, chandelierStemHalfHeight} from '../physics/chandelier.ts'

/** Consolidated by material and shadow behavior, with all eight candle arms retained. */
export class ChandelierGeometry {
  readonly armColliders: Array<Float32Array> = []
  readonly brass: BufferGeometry
  readonly candles: BufferGeometry
  readonly canopy = new CylinderGeometry(0.3, 0.22, 0.12, 32).translate(0, chandelierPhysics.anchor[1] + 0.02, 0)
  readonly flames: BufferGeometry
  readonly pendant = new SphereGeometry(0.09, 16, 12).scale(1, 1.4, 1).translate(0, -0.38, 0)
  readonly ringColliders: Array<Float32Array> = []

  constructor() {
    for (let i = 0; i < 16; i++) {
      const sector = new TorusGeometry(0.66, 0.032, 8, 4, Math.PI / 8).rotateZ(i * Math.PI / 8).rotateX(Math.PI / 2).translate(0, -0.12, 0)
      this.ringColliders.push(Float32Array.from(sector.getAttribute('position').array))
      sector.dispose()
    }
    const brass: Array<BufferGeometry> = [
      new CylinderGeometry(0.022, 0.022, chandelierStemHalfHeight * 2, 12).translate(0, chandelierStemCenter, 0),
      new SphereGeometry(0.19, 24, 16).scale(1, 1.5, 1),
      new TorusGeometry(0.66, 0.032, 8, 64).rotateX(Math.PI / 2).translate(0, -0.12, 0),
    ]
    const candles: Array<BufferGeometry> = []
    const flames: Array<BufferGeometry> = []
    const arm = new QuadraticBezierCurve3(new Vector3(0.18, 0, 0), new Vector3(0.8, -0.5, 0), new Vector3(1.25, 0.15, 0))
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4
      brass.push(new TubeGeometry(arm, 20, 0.027, 8, false).rotateY(angle), new CylinderGeometry(0.14, 0.07, 0.08, 24).translate(1.25, 0.17, 0).rotateY(angle))
      candles.push(new CylinderGeometry(0.045, 0.055, 0.24, 12).translate(1.25, 0.32, 0).rotateY(angle))
      // Separate convex arms leave the spaces between them open to thrown objects.
      this.armColliders.push(Float32Array.from([...brass.at(-2)!.getAttribute('position').array, ...brass.at(-1)!.getAttribute('position').array, ...candles.at(-1)!.getAttribute('position').array]))
      flames.push(new SphereGeometry(0.07, 12, 8).scale(0.8, 1.5, 0.8).translate(1.25, 0.51, 0).rotateY(angle))
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

import type {BufferGeometry} from 'three/webgpu'

import {CylinderGeometry, QuadraticBezierCurve3, SphereGeometry, TorusGeometry, TubeGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'

/** Consolidated by material and shadow behavior, with all eight candle arms retained. */
export class ChandelierGeometry {
  readonly brass: BufferGeometry
  readonly candles: BufferGeometry
  readonly flames: BufferGeometry
  readonly pendant = new SphereGeometry(0.09, 16, 12).scale(1, 1.4, 1).translate(0, -0.38, 0)

  constructor() {
    const brass: Array<BufferGeometry> = [
      new CylinderGeometry(0.022, 0.022, 1.5, 12).translate(0, 0.85, 0),
      new CylinderGeometry(0.3, 0.22, 0.12, 32).translate(0, 1.57, 0),
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
  }
}

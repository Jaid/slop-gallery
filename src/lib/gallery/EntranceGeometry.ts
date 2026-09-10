import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {mainEntrance} from './entrance.ts'

const extrude = (shape: Shape, thickness: number, z: number) => new ExtrudeGeometry(shape, {
  depth: thickness,
  bevelEnabled: false,
  curveSegments: 48,
}).translate(0, 0, z)

/** A paired, arched walnut door in a deep limestone and bronze surround. */
export class EntranceGeometry {
  readonly frame: BufferGeometry
  readonly leaves: BufferGeometry
  readonly metal: BufferGeometry

  constructor() {
    const {width, spring, depth} = mainEntrance
    const radius = width / 2
    const leaves: Array<BufferGeometry> = []
    const frame: Array<BufferGeometry> = []
    const metal: Array<BufferGeometry> = []
    const surround = (inner: number, outer: number, z: number, thickness: number) => {
      const shape = new Shape
      shape.moveTo(-outer, 0)
      shape.lineTo(-inner, 0)
      shape.lineTo(-inner, spring)
      shape.absarc(0, spring, inner, Math.PI, 0, true)
      shape.lineTo(inner, 0)
      shape.lineTo(outer, 0)
      shape.lineTo(outer, spring)
      shape.absarc(0, spring, outer, 0, Math.PI, false)
      shape.closePath()
      return extrude(shape, thickness, z)
    }
    frame.push(surround(radius + 0.025, radius + 0.25, 0.11, 0.25), surround(radius + 0.25, radius + 0.32, 0.11, 0.18))
    metal.push(surround(radius + 0.03, radius + 0.055, 0.365, 0.02))
    for (const side of [-1, 1]) {
      const shape = new Shape
      shape.moveTo(side * 0.014, 0.04)
      shape.lineTo(side * (radius - 0.018), 0.04)
      shape.lineTo(side * (radius - 0.018), spring)
      for (let i = 0; i <= 48; i++) {
        const angle = i / 48 * Math.PI / 2
        shape.lineTo(side * Math.max(0.014, Math.cos(angle) * (radius - 0.018)), spring + Math.sin(angle) * (radius - 0.018))
      }
      shape.closePath()
      leaves.push(extrude(shape, depth, 0.115))
      for (const y of [0.75, 2.12]) {
        const centerX = side * radius / 2
        leaves.push(new BoxGeometry(1.24, 1.1, 0.065).translate(centerX, y, 0.3))
        for (const x of [-0.66, 0.66]) {
          metal.push(new BoxGeometry(0.024, 1.2, 0.015).translate(centerX + x, y, 0.342))
        }
        for (const dy of [-0.6, 0.6]) {
          metal.push(new BoxGeometry(1.34, 0.024, 0.015).translate(centerX, y + dy, 0.342))
        }
      }
      for (const y of [0.36, 1.48, 2.86, 3.44]) {
        metal.push(new BoxGeometry(0.4, 0.065, 0.045).translate(side * 1.43, y, 0.33), new CylinderGeometry(0.048, 0.048, 0.19, 12).translate(side * 1.6, y, 0.36))
      }
      metal.push(new TorusGeometry(0.12, 0.025, 8, 32).scale(0.7, 1.4, 1).translate(side * 0.22, 1.54, 0.4), new SphereGeometry(0.07, 16, 12).translate(side * 0.22, 1.7, 0.36))
      frame.push(new BoxGeometry(0.55, 0.3, 0.48).translate(side * 1.84, 0.15, 0.24), new BoxGeometry(0.46, 0.2, 0.42).translate(side * 1.84, spring, 0.21))
    }
    this.leaves = mergeParts(leaves)
    this.frame = mergeParts(frame)
    this.metal = mergeParts(metal)
  }

  dispose() {
    this.leaves.dispose()
    this.frame.dispose()
    this.metal.dispose()
  }
}

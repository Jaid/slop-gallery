import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, CylinderGeometry, TorusGeometry} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {knotModelSign, modelSignSuspension} from '../physics/knotModelSign.ts'

export default class KnotModelSignGeometry {
  readonly canopy: BufferGeometry
  readonly chains: BufferGeometry
  readonly panel = new BoxGeometry(...knotModelSign.size)

  constructor() {
    const chains: Array<BufferGeometry> = []
    const canopy: Array<BufferGeometry> = []
    const bottom = modelSignSuspension.bottom + 0.04
    const count = Math.ceil((modelSignSuspension.top - bottom) / 0.055) + 1
    for (const x of knotModelSign.suspensionX) {
      canopy.push(new CylinderGeometry(0.14, 0.11, 0.1, 24).translate(x, knotModelSign.anchor[1] + 0.05, 0))
      for (let i = 0; i < count; i++) {
        const y = bottom + (modelSignSuspension.top - bottom) * i / (count - 1)
        chains.push(new TorusGeometry(0.027, 0.007, 6, 12).scale(1, 1.5, 1).rotateY(i % 2 * Math.PI / 2).translate(x, y, 0))
      }
    }
    this.chains = mergeParts(chains)
    this.canopy = mergeParts(canopy)
  }

  dispose() {
    this.panel.dispose()
    this.chains.dispose()
    this.canopy.dispose()
  }
}

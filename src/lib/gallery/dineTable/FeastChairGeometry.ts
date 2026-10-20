import type {BufferGeometry} from 'three/webgpu'

import {CylinderGeometry, ExtrudeGeometry, Shape} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {place} from '../lodgeInterior/place.ts'
import RevolvedProfileGeometry from '../RevolvedProfileGeometry.ts'
import dineTable from './layout.ts'
import {slab, timber, woodBar} from './parts.ts'

function back(w: number, bottom: number, top: number, thickness: number, bevel: number) {
  const shape = new Shape
  shape.moveTo(-w / 2, bottom)
  shape.lineTo(w / 2, bottom)
  shape.lineTo(w / 2, top - 0.13)
  shape.quadraticCurveTo(0, top + 0.13, -w / 2, top - 0.13)
  shape.closePath()
  const geometry = new ExtrudeGeometry(shape, {
    depth: thickness - bevel * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 12,
    steps: 1,
  })
  return geometry.translate(0, 0, 0.25 - thickness / 2 + bevel)
}

/** An arched, upholstered walnut dining chair, facing −z. One mesh per material is shared by all eighteen chairs. */
export default class FeastChairGeometry {
  readonly brass: BufferGeometry
  readonly fabric: BufferGeometry
  readonly wood: BufferGeometry

  constructor() {
    const {width, depth, seatY, height} = dineTable.chair
    const wood: Array<BufferGeometry> = [timber(slab(width, depth, 0.065, 0.065, seatY - 0.035), 'z', 0.4)]
    const fabric: Array<BufferGeometry> = [slab(width - 0.065, depth - 0.065, 0.065, 0.09, seatY + 0.02, 0.018)]
    const brass: Array<BufferGeometry> = []
    for (const x of [-0.24, 0.24]) {
      for (const z of [-0.24, 0.24]) {
        const leg = new RevolvedProfileGeometry([
          [0, 0.405],
          [0.035, 0.405],
          [0.035, 0.34],
          [0.027, 0.31],
          [0.039, 0.28],
          [0.04, 0.25],
          [0.027, 0.22],
          [0.021, 0.07],
          [0.026, 0.025],
          [0, 0.025],
        ], {sides: 12})
        wood.push(timber(leg, 'y', x + z + 0.7).translate(x, 0, z))
        brass.push(place(new CylinderGeometry(0.027, 0.029, 0.027, 12), x, 0.0135, z))
      }
      wood.push(woodBar([0.025, 0.035, 0.49], [x, 0.16, 0], 'z', x + 1))
      wood.push(timber(new CylinderGeometry(0.025, 0.028, 0.44, 12), 'y', x + 0.2).translate(x, 0.64, 0.25))
    }
    wood.push(woodBar([0.48, 0.035, 0.025], [0, 0.16, 0.22], 'x', 0.5))
    wood.push(timber(back(width - 0.035, 0.63, height - 0.008, 0.07, 0.008), 'y', 0.8))
    fabric.push(back(width - 0.15, 0.7, height - 0.065, 0.095, 0.012))
    // Individual nailheads track the arched crest on both faces.
    for (const face of [-1, 1]) {
      for (let i = 0; i <= 8; i++) {
        const x = (i / 8 - 0.5) * (width - 0.075)
        const y = height - 0.025 - 0.13 * (x / ((width - 0.075) / 2)) ** 2
        const tack = new CylinderGeometry(0.005, 0.005, 0.005, 6)
        brass.push(tack.rotateX(Math.PI / 2).translate(x, y, 0.25 + face * 0.038))
      }
    }
    this.wood = mergeParts(wood)
    this.fabric = mergeParts(fabric)
    this.brass = mergeParts(brass)
  }

  dispose() {
    this.wood.dispose()
    this.fabric.dispose()
    this.brass.dispose()
  }
}

import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {lodgeEastWindow} from './lodge.ts'

const box = (size: readonly [number, number, number], position: readonly [number, number, number]) => {
  const geometry = new BoxGeometry(...size)
  geometry.translate(...position)
  return geometry
}

/** The glazed dead end of the Bastion's new branch, matching the Lodge's west window in brass, height and proportions. */
export default class LodgeEastWindowGeometry {
  readonly frame: BufferGeometry
  readonly glass: BoxGeometry
  readonly lining: BufferGeometry

  constructor() {
    const {x, z, width, bottom, top, glassThickness} = lodgeEastWindow
    const height = top - bottom
    const middleY = (bottom + top) / 2
    const reveal = 0.14
    const border = 0.09
    // The stone reveal wraps the opening into the Lodge's wall, with a projecting sill.
    this.lining = mergeParts([
      box([0.27, 0.16, width + border * 2], [x + 0.03, bottom - 0.08, z]),
      box([0.24, border, width + border * 2], [x + 0.02, top + border / 2, z]),
      ...[-1, 1].map(side => box([0.24, height, border], [x + 0.02, middleY, z + side * (width + border) / 2])),
    ])
    this.glass = box([glassThickness, height, width], [x + reveal - glassThickness / 2, middleY, z])
    const stop = 0.035
    const stopX = x + reveal + 0.0125
    this.frame = mergeParts([
      ...[bottom + stop / 2, top - stop / 2].map(y => box([0.025, stop, width], [stopX, y, z])),
      ...[-1, 1].map(side => box([0.025, height - stop * 2, stop], [stopX, middleY, z + side * (width - stop) / 2])),
    ])
  }

  dispose() {
    this.frame.dispose()
    this.glass.dispose()
    this.lining.dispose()
  }
}

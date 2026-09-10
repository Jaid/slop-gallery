import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, ExtrudeGeometry, Shape} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import {cabin, cabinApproach, cabinWindow} from './cabin.ts'
import {timberProfile} from './passages/TimberGeometry.ts'

/** A wood-lined through-wall recess with its only pane at the tunnel end. */
export class CabinWindowGeometry {
  readonly frame: BufferGeometry
  readonly glass: BoxGeometry
  readonly lining: BufferGeometry

  constructor() {
    const {roomX, tunnelX, z, bottom, top, width, lining, glassThickness} = cabinWindow
    const height = top - bottom
    const y = (bottom + top) / 2
    // Follow the existing plank backing, including its sloped roof: no projecting box.
    const profile = timberProfile(cabinApproach.width / 2 - 0.09, cabinApproach.height, 0)
      .filter(point => point.x > 0)
      .map(point => point.set(point.x + cabin.approachX, point.y + cabin.floorY))
      .toSorted((a, b) => a.y - b.y)
    const edgeX = (level: number) => {
      const upper = profile.findIndex(point => point.y >= level)
      if (upper <= 0) {
        return (upper < 0 ? profile.at(-1)! : profile[0]!).x
      }
      const a = profile[upper - 1]!
      const b = profile[upper]!
      return a.x + (b.x - a.x) * (level - a.y) / (b.y - a.y)
    }
    const panel = (from: number, to: number, startZ: number, depth: number) => {
      const shape = new Shape
      shape.moveTo(roomX, from)
      shape.lineTo(roomX, to)
      shape.lineTo(edgeX(to), to)
      for (const point of profile.toReversed()) {
        if (point.y > from && point.y < to) {
          shape.lineTo(point.x, point.y)
        }
      }
      shape.lineTo(edgeX(from), from)
      shape.closePath()
      return new ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: false,
      }).translate(0, 0, startZ)
    }
    this.lining = mergeParts([
      panel(bottom - lining, bottom, z - width / 2 - lining, width + lining * 2),
      panel(top, top + lining, z - width / 2 - lining, width + lining * 2),
      panel(bottom, top, z - width / 2 - lining, lining),
      panel(bottom, top, z + width / 2, lining),
    ])
    this.glass = new BoxGeometry(glassThickness, height, width).translate(tunnelX + glassThickness / 2, y, z)
    // A narrow brass stop makes the recessed pane legible without a second room-side sheet.
    const stop = 0.035
    this.frame = mergeParts([
      ...[bottom + stop / 2, top - stop / 2].map(level => new BoxGeometry(0.025, stop, width).translate(tunnelX + glassThickness + 0.0125, level, z)),
      ...[-1, 1].map(side => new BoxGeometry(0.025, height - stop * 2, stop).translate(tunnelX + glassThickness + 0.0125, y, z + side * (width - stop) / 2)),
    ])
  }

  dispose() {
    this.lining.dispose()
    this.glass.dispose()
    this.frame.dispose()
  }
}

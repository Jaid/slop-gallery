import type {RoomId, Vec3} from '../types.ts'
import type {Wall} from '../walls.ts'

import {passageOrientation} from '../passages/orientation.ts'

export type StairBlock = {
  axis?: 0 | 2
  direction: number
  position: Vec3
  size: Vec3
  top: number
  tread: boolean
}
export type StairBeam = {
  position: Vec3
  rotation: Vec3
  size: Vec3
}
export const stairThickness = 0.6
export const stairHeadroom = 3.6

export class StairFlight {
  readonly axis: 0 | 2
  readonly blocks: Array<StairBlock>
  readonly crossAxis: 0 | 2
  readonly direction: number
  readonly length: number
  readonly rise: number
  readonly run: number
  readonly slope: number

  constructor(readonly id: string, readonly start: Vec3, readonly end: Vec3, readonly width: number, readonly count: number, readonly entryLanding = 0, readonly exitLanding = 0, readonly room: RoomId = 'moonfall') {
    this.axis = start[0] === end[0] ? 2 : 0
    this.crossAxis = this.axis === 0 ? 2 : 0
    this.direction = Math.sign(end[this.axis] - start[this.axis])
    this.length = Math.abs(end[this.axis] - start[this.axis])
    this.rise = (start[1] - end[1]) / count
    this.run = (this.length - entryLanding - exitLanding) / count
    this.slope = (end[1] - start[1]) / (end[this.axis] - start[this.axis])
    if (![...start, ...end, width, count, entryLanding, exitLanding].every(Number.isFinite) || start[this.crossAxis] !== end[this.crossAxis] || !this.direction || width <= 0 || !Number.isSafeInteger(count) || count <= 0 || this.rise <= 0 || this.run <= 0 || entryLanding < 0 || exitLanding < 0) {
      throw new RangeError('A stair flight needs a descending X- or Z-axis run, positive dimensions and a whole number of steps.')
    }
    this.blocks = []
    if (entryLanding) {
      this.blocks.push(this.block(entryLanding / 2, entryLanding, start[1], false))
    }
    for (let i = 1; i <= count; i++) {
      this.blocks.push(this.block(entryLanding + (i - 0.5) * this.run, this.run, start[1] - i * this.rise, true))
    }
    if (exitLanding) {
      this.blocks.push(this.block(this.length - exitLanding / 2, exitLanding, end[1], false))
    }
  }

  beam(height: number, thickness: number, width: number, cross = this.start[this.crossAxis]): StairBeam {
    const position: Vec3 = [(this.start[0] + this.end[0]) / 2, (this.start[1] + this.end[1]) / 2 + height, (this.start[2] + this.end[2]) / 2]
    position[this.crossAxis] = cross
    const size: Vec3 = [width, thickness, width]
    size[this.axis] = Math.hypot(this.length, this.start[1] - this.end[1])
    return {
      position,
      rotation: this.axis === 0 ? [0, 0, Math.atan(this.slope)] : [-Math.atan(this.slope), 0, 0],
      size,
    }
  }

  wall(side: number): Wall {
    // A straight grade differs from discrete treads, especially beside a landing.
    // Extend below every tread underside instead of leaving triangular daylight gaps.
    const depth = Math.max(...this.blocks.map(block => {
      const leading = block.position[this.axis] - this.direction * block.size[this.axis] / 2
      return this.start[1] + (leading - this.start[this.axis]) * this.slope - block.top + stairThickness
    }))
    const center: Vec3 = [(this.start[0] + this.end[0]) / 2, (this.start[1] + this.end[1]) / 2 - depth, (this.start[2] + this.end[2]) / 2]
    center[this.crossAxis] += side * this.width / 2
    const face = passageOrientation(this.axis, side)
    return {
      id: `${this.room}-stairs-${this.id}-${face.name}`,
      room: this.room,
      center,
      rotation: face.rotation,
      width: this.length,
      height: stairHeadroom + depth - 0.3,
      slope: this.slope * (side < 0 ? 1 : -1) * (this.axis === 0 ? 1 : -1),
      hangable: false,
    }
  }

  private block(distance: number, length: number, top: number, tread: boolean): StairBlock {
    const position: Vec3 = [this.start[0], top - stairThickness / 2, this.start[2]]
    position[this.axis] += this.direction * distance
    const size: Vec3 = [this.width, stairThickness, this.width]
    size[this.axis] = length
    return {
      axis: this.axis,
      position,
      size,
      direction: this.direction,
      top,
      tread,
    }
  }
}

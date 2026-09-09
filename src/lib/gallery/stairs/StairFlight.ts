import type {Vec3} from '../types.ts'
import type {Wall} from '../walls.ts'

export type StairBlock = {
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
  readonly blocks: Array<StairBlock>
  readonly direction: number
  readonly length: number
  readonly rise: number
  readonly run: number
  readonly slope: number

  constructor(readonly id: string, readonly start: Vec3, readonly end: Vec3, readonly width: number, readonly count: number, readonly entryLanding = 0, readonly exitLanding = 0) {
    this.direction = Math.sign(end[0] - start[0])
    this.length = Math.abs(end[0] - start[0])
    this.rise = (start[1] - end[1]) / count
    this.run = (this.length - entryLanding - exitLanding) / count
    this.slope = (end[1] - start[1]) / (end[0] - start[0])
    if (![...start, ...end, width, count, entryLanding, exitLanding].every(Number.isFinite) || start[2] !== end[2] || !this.direction || width <= 0 || !Number.isSafeInteger(count) || count <= 0 || this.rise <= 0 || this.run <= 0 || entryLanding < 0 || exitLanding < 0) {
      throw new RangeError('A stair flight needs a descending X-axis run, positive dimensions and a whole number of steps.')
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

  beam(height: number, thickness: number, width: number, z = this.start[2]): StairBeam {
    return {
      position: [(this.start[0] + this.end[0]) / 2, (this.start[1] + this.end[1]) / 2 + height, z],
      rotation: [0, 0, Math.atan(this.slope)],
      size: [Math.hypot(this.length, this.start[1] - this.end[1]), thickness, width],
    }
  }

  wall(side: number): Wall {
    // A straight grade differs from discrete treads, especially beside a landing.
    // Extend below every tread underside instead of leaving triangular daylight gaps.
    const depth = Math.max(...this.blocks.map(block => {
      const leadingX = block.position[0] - this.direction * block.size[0] / 2
      return this.start[1] + (leadingX - this.start[0]) * this.slope - block.top + stairThickness
    }))
    return {
      id: `undertone-stairs-${this.id}-${side < 0 ? 'north' : 'south'}`,
      room: 'undertone',
      center: [(this.start[0] + this.end[0]) / 2, (this.start[1] + this.end[1]) / 2 - depth, this.start[2] + side * this.width / 2],
      rotation: side < 0 ? 0 : Math.PI,
      width: this.length,
      height: stairHeadroom + depth - 0.3,
      slope: side < 0 ? this.slope : -this.slope,
      hangable: false,
    }
  }

  private block(distance: number, length: number, top: number, tread: boolean): StairBlock {
    return {
      position: [this.start[0] + this.direction * distance, top - stairThickness / 2, this.start[2]],
      size: [length, stairThickness, this.width],
      direction: this.direction,
      top,
      tread,
    }
  }
}

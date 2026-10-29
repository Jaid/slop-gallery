import type {Position} from '../types.ts'

import zod from 'zod'

import Box, {footprintShape} from './base/Box.ts'

export const skyBoxInputSchema = zod.strictObject({
  ...footprintShape,
  floor: zod.number(),
})
export type SkyBoxInput = zod.input<typeof skyBoxInputSchema>

/** the column over its footprint from its floor up */
export default class SkyBox extends Box {
  readonly floor: number

  constructor(input: SkyBoxInput) {
    const {floor, ...footprint} = skyBoxInputSchema.parse(input)
    super(footprint)
    this.floor = floor
  }

  contains(position: Position) {
    return position[1] >= this.floor && this.footprintContains(position)
  }

  translate(offset: Position) {
    return new SkyBox({
      ...this.translateFootprint(offset),
      floor: this.floor + offset[1],
    })
  }
}

import type {BeamBoxInput} from './BeamBox.ts'
import type {ClosedBoxInput} from './ClosedBox.ts'
import type {SkyBoxInput} from './SkyBox.ts'
import type {VoidBoxInput} from './VoidBox.ts'

import zod from 'zod'

import Box from './base/Box.ts'
import BeamBox, {beamBoxInputSchema} from './BeamBox.ts'
import ClosedBox, {closedBoxInputSchema} from './ClosedBox.ts'
import SkyBox, {skyBoxInputSchema} from './SkyBox.ts'
import VoidBox, {voidBoxInputSchema} from './VoidBox.ts'

/** the plain data of any box, told apart by its keys */
export const boxInputSchema = zod.union([beamBoxInputSchema, skyBoxInputSchema, voidBoxInputSchema, closedBoxInputSchema])
export type BoxInput = BeamBoxInput | ClosedBoxInput | SkyBoxInput | VoidBoxInput

/** The box as is, or the box described by the plain data: a sky box with a floor, a void box with a ceiling, a closed box with y and a beam box otherwise; the class’s schema rejects every key left over. */
export function createBox(input: Box | BoxInput): Box {
  if (input instanceof Box) {
    return input
  }
  if ('floor' in input) {
    return new SkyBox(input)
  }
  if ('ceiling' in input) {
    return new VoidBox(input)
  }
  if ('y' in input) {
    return new ClosedBox(input)
  }
  return new BeamBox(input)
}

export {default as Box} from './base/Box.ts'
export type {FootprintInput} from './base/Box.ts'
export {default as BeamBox, beamBoxInputSchema} from './BeamBox.ts'
export type {BeamBoxInput} from './BeamBox.ts'
export {default as ClosedBox, closedBoxInputSchema} from './ClosedBox.ts'
export type {ClosedBoxInput} from './ClosedBox.ts'
export {default as SkyBox, skyBoxInputSchema} from './SkyBox.ts'
export type {SkyBoxInput} from './SkyBox.ts'
export {default as VoidBox, voidBoxInputSchema} from './VoidBox.ts'
export type {VoidBoxInput} from './VoidBox.ts'

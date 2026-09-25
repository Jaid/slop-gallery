import * as math from 'math'
import * as color from 'math/color'
import * as geometry from 'math/geometry'
import * as ik from 'math/ik'
import * as noise from 'math/noise'
import * as mathRandom from 'math/random'
import * as shapes from 'math/shapes'
import * as time from 'math/time'

import {NotBakeableError} from './types.ts'

type NativeModule = Readonly<Record<string, unknown>>

const rejectRandomSeed = (): never => {
  throw new NotBakeableError('Random seed generation requires allowFreezingRandomness.')
}
const deterministicRandom = {
  ...mathRandom,
  isaac32: {
    ...mathRandom.isaac32,
    seed: rejectRandomSeed,
  },
  isaac64: {
    ...mathRandom.isaac64,
    seed: rejectRandomSeed,
  },
  mulberry32: {
    ...mathRandom.mulberry32,
    seed: rejectRandomSeed,
  },
} satisfies NativeModule
const modules = new Map<string, NativeModule>([
  ['math', math],
  ['math/color', color],
  ['math/geometry', geometry],
  ['math/ik', ik],
  ['math/noise', noise],
  ['math/shapes', shapes],
  ['math/time', time],
])

/** Built-in pure math capabilities shared by every bake adapter. */
export default function mathModule(source: string, allowFreezingRandomness: boolean): NativeModule | undefined {
  if (source === 'math/random') {
    return allowFreezingRandomness ? mathRandom : deterministicRandom
  }
  return modules.get(source)
}

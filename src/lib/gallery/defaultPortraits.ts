import type {Portrait} from './types.ts'

import optis from 'optis'
import readPermalink from 'read-permalink'

import artworks from '#level/artworks.ts'
import slots from '#level/slots.ts'

import {environmentRoll} from '../environmentSeed.ts'

const disabledValues = new Set<unknown>([false, 'false', '0'])
const portraitsSchema = optis({
  defaults: {
    portraits: true,
  },
  normalizations: {
    portraits(value: unknown) {
      return !disabledValues.has(value)
    },
  },
})

/** Read the `?portraits` flag; only `?portraits=false` turns the default works off. */
export function readDefaultPortraitsEnabled(input: URL | string = typeof location === 'undefined' ? '' : location.href): boolean {
  return readPermalink(input, {schema: portraitsSchema}).portraits
}

/** whether new game states get the level’s default works, false with `?portraits=false`, read once at startup */
export const hasDefaultPortraits = readDefaultPortraitsEnabled()

/**
 * The level’s default works for a new game state, or none with `?portraits=false`, each hung in a portrait slot of its ratio, the free ones of higher priority first and among equal ones drawn by the environment `seed`. A work takes the size of its slot, so the same work hangs larger or smaller from one seed to the next.
 */
export default function defaultPortraits(seed: number): Array<Portrait> {
  if (!hasDefaultPortraits) {
    return []
  }
  const free = slots.toSorted((a, b) => b.priority - a.priority || environmentRoll(seed, `portrait-slot:${a.id}`) - environmentRoll(seed, `portrait-slot:${b.id}`))
  return artworks.map(({ratio, ...artwork}) => {
    const index = free.findIndex(slot => slot.ratio === ratio)
    if (index === -1) {
      throw new Error(`No ${ratio} portrait slot is left for ${artwork.id}.`)
    }
    const [slot] = free.splice(index, 1)
    return {
      ...artwork,
      position: [...slot.position],
      rotation: slot.rotation,
      width: slot.width,
      height: slot.height,
      hung: true,
      wallId: slot.wallId,
      ...slot.labelAbove ? {labelAbove: true} : {},
    }
  })
}

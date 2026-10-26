import type {Portrait} from './types.ts'

import optis from 'optis'
import readPermalink from 'read-permalink'

import artworks from '#level/artworks.ts'
import slots from '#level/slots.ts'

import {environmentRoll} from '../environmentSeed.ts'

const portraitSets = ['classic'] as const

/** the set of default works new game states get, or `false` for none */
export type PortraitSet = typeof portraitSets[number] | false

const portraitSetSchema = optis({
  defaults: {
    portrait_set: 'classic',
  },
  normalizations: {
    portrait_set(value: unknown): PortraitSet {
      if (value === false || value === 'false') {
        return false
      }
      return portraitSets.find(portraitSet => portraitSet === value) ?? 'classic'
    },
  },
})

/** Read the `?portrait_set` of default works: `classic`, or `false` for none. Anything else is `classic`. */
export function readPortraitSet(input: URL | string = typeof location === 'undefined' ? '' : location.href): PortraitSet {
  return readPermalink(input, {schema: portraitSetSchema}).portrait_set
}

/** the default works new game states get, read once at startup */
export const portraitSet = readPortraitSet()

/**
 * The level’s default works for a new game state, or none with `?portrait_set=false`, each hung in a portrait slot of its ratio, the free ones of higher priority first and among equal ones drawn by the environment `seed`. A work takes the size of its slot, so the same work hangs larger or smaller from one seed to the next.
 */
export default function defaultPortraits(seed: number): Array<Portrait> {
  if (!portraitSet) {
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

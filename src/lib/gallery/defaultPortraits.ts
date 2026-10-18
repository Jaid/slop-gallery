import type {Portrait} from './types.ts'

import {environmentRoll} from '../environmentSeed.ts'
import artworks from './artworks.ts'
import slots from './slots.ts'

/**
 * The level’s default works for a new game state, each hung in a portrait slot of its ratio drawn by the environment `seed`. A work takes the size of its slot, so the same work hangs larger or smaller from one seed to the next.
 */
export default function defaultPortraits(seed: number): Array<Portrait> {
  const free = slots.toSorted((a, b) => environmentRoll(seed, `portrait-slot:${a.id}`) - environmentRoll(seed, `portrait-slot:${b.id}`))
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

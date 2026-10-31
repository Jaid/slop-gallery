import type {ThrownOrb} from './types.ts'

import {environmentSample} from '../environmentSeed.ts'

/** an orb’s kind; its prop is `prop-orb-<id>` */
export type OrbKind = Omit<ThrownOrb, 'id' | 'prompt'> & {
  id: string
  /** the orb’s whole instruction to the image model in the environment of `seed`, sent verbatim along with the work */
  prompt: (seed: number) => string
}

/** the radius of every orb’s ball, in meters */
export const orbRadius = 0.14

const halloweenAdjectives = ['unsettling', 'creepy', 'eerie', 'disturbing', 'nightmarish', 'uncanny', 'haunting', 'grotesque', 'paranormal', 'liminal', 'distorted']

export const halloweenOrb: OrbKind = {
  id: 'halloween',
  title: 'Halloween Orb',
  color: '#6a1fd0',
  prompt: seed => {
    const adjectives = environmentSample(seed, 'halloween-orb', halloweenAdjectives, 5)
    return `This picture is hanging on a wall in a horror game where all artworks suddenly turn into a corrupted version.\n\nPlease edit this image and provide traits that make it ${adjectives.slice(0, -1).join(', ')} or ${adjectives.at(-1)}.`
  },
}

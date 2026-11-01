import type {OrbGlassOptions} from '#src/lib/materials/orb/base/OrbGlassMaterial.ts'

import EyeOrbMaterial from '#src/lib/materials/orb/EyeOrbMaterial.ts'

import Orb from './base/Orb.ts'

/** A bloodshot eye bleeding into its liquid. It corrupts a work into something disturbing. */
export default class HorrorOrb extends Orb {
  readonly adjectives = ['unsettling', 'creepy', 'eerie', 'disturbing', 'nightmarish', 'uncanny', 'haunting', 'grotesque', 'paranormal', 'liminal', 'distorted', 'sinister', 'delirious', 'shocking', 'macabre', 'morbid', 'gory', 'bloodstained', 'decaying', 'putrid', 'deranged', 'twisted', 'menacing', 'feverish', 'visceral', 'unhinged', 'claustrophobic', 'dread-filled']
  readonly change = 'provide traits that make it'
  readonly color = '#a8060f'
  readonly id = 'horror'
  readonly premise = 'This picture is in a horror game – suddenly turned into a corrupted version.'
  readonly title = 'Horror Orb'

  createMaterial(options: OrbGlassOptions) {
    return new EyeOrbMaterial(options)
  }
}

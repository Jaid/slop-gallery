import type {OrbGlassOptions} from '#src/lib/materials/orb/base/OrbGlassMaterial.ts'

import GhostsOrbMaterial from '#src/lib/materials/orb/GhostsOrbMaterial.ts'

import Orb from './base/Orb.ts'

/** Blinking ghosts drifting through green mist. It lets something supernatural slip into a work. */
export default class SpookOrb extends Orb {
  readonly adjectives = [
    // presence
    'spooky',
    ['ghostly', 'spectral', 'phantasmal', 'wraithlike'],
    ['ethereal', 'otherworldly'],
    ['haunted', 'poltergeist-ridden'],
    'restless',
    'whispering',
    // atmosphere
    'misty',
    'shadowy',
    'glowing',
    ['mysterious', 'uncanny'],
    // magic
    ['enchanted', 'bewitched'],
    'cursed',
    ['occult', 'séance-like'],
    'possessed',
  ]
  readonly change = 'add something supernatural that makes it'
  readonly color = '#3fd98a'
  readonly id = 'spook'
  readonly premise = 'This picture is in a ghost story – something otherworldly has slipped into it.'
  readonly title = 'Spook Orb'

  createMaterial(options: OrbGlassOptions) {
    return new GhostsOrbMaterial(options)
  }
}

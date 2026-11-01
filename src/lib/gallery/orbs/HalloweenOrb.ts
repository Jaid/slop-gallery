import type {OrbGlassOptions} from '#src/lib/materials/orb/base/OrbGlassMaterial.ts'

import BatsOrbMaterial from '#src/lib/materials/orb/BatsOrbMaterial.ts'

import Orb from './base/Orb.ts'

/** Bats circling a harvest moon in orange haze. It dresses a work up for Halloween, festive rather than frightening. */
export default class HalloweenOrb extends Orb {
  readonly adjectives = ['festive', 'playful', 'cozy', 'whimsical', 'cheerful', 'mischievous', 'autumnal', 'candlelit', 'lantern-lit', 'moonlit', 'cobwebbed', 'pumpkin-filled', 'candy-strewn', 'costumed', 'witchy', 'bat-garlanded', 'orange-and-black', 'harvest-themed', 'party-ready', 'spooky-cute', 'trick-or-treat-ready', 'misty']
  readonly change = 'add casual Halloween decoration that makes it'
  readonly color = '#ff7b1c'
  readonly id = 'halloween'
  readonly premise = 'This picture is in a game – and tonight is Halloween, so it gets dressed up for the holiday.'
  readonly title = 'Halloween Orb'

  createMaterial(options: OrbGlassOptions) {
    return new BatsOrbMaterial(options)
  }
}

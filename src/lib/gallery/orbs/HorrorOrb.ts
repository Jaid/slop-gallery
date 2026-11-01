import type {OrbGlassOptions} from '#src/lib/materials/orb/base/OrbGlassMaterial.ts'

import EyeOrbMaterial from '#src/lib/materials/orb/EyeOrbMaterial.ts'
import {horrorMood} from '#src/lib/moods/index.ts'

import Orb from './base/Orb.ts'

/** A bloodshot eye bleeding into its liquid. It corrupts a work into something disturbing. */
export default class HorrorOrb extends Orb {
  readonly adjectives = [
    // unease
    ['unsettling', 'disturbing'],
    ['creepy', 'eerie'],
    ['uncanny', 'liminal'],
    'haunting',
    'paranormal',
    // threat
    ['sinister', 'menacing'],
    ['nightmarish', 'dread-filled'],
    'claustrophobic',
    // madness
    ['delirious', 'feverish'],
    ['deranged', 'unhinged'],
    ['distorted', 'twisted'],
    // shock
    'shocking',
    ['macabre', 'morbid'],
    'grotesque',
    // decay
    ['decaying', 'putrid'],
    // blood
    ['gory', 'bloodstained', 'visceral'],
  ]
  readonly change = 'provide traits that make it'
  readonly color = '#a8060f'
  readonly id = 'horror'
  readonly mood = horrorMood
  readonly premise = 'This picture is in a horror game – suddenly turned into a corrupted version.'
  readonly title = 'Horror Orb'

  createMaterial(options: OrbGlassOptions) {
    return new EyeOrbMaterial(options)
  }
}

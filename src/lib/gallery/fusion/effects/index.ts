import BatsEffect from './bats/BatsEffect.ts'
import BloodEffect from './blood/BloodEffect.ts'
import GhostsEffect from './ghosts/GhostsEffect.ts'

export const batsEffect = new BatsEffect
export const bloodEffect = new BloodEffect
export const ghostsEffect = new GhostsEffect
/** every effect there is, by the orb it belongs to */
export const fusionEffects = [batsEffect, bloodEffect, ghostsEffect] as const

export type {EffectShow, default as FusionEffect} from './base/FusionEffect.ts'

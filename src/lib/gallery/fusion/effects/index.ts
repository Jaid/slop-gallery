import GhostsEffect from './ghosts/GhostsEffect.ts'

export const ghostsEffect = new GhostsEffect
export const fusionEffects = [ghostsEffect] as const

export type {EffectShow, default as FusionEffect} from './base/FusionEffect.ts'

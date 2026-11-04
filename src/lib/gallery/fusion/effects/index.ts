import BatsEffect from './bats/BatsEffect.ts'
import BloodEffect from './blood/BloodEffect.ts'
import CandyEffect from './candy/CandyEffect.ts'
import EyesEffect from './eyes/EyesEffect.ts'
import GhostsEffect from './ghosts/GhostsEffect.ts'
import LanternsEffect from './lanterns/LanternsEffect.ts'
import TendrilsEffect from './tendrils/TendrilsEffect.ts'

export const batsEffect = new BatsEffect
export const bloodEffect = new BloodEffect
export const candyEffect = new CandyEffect
export const eyesEffect = new EyesEffect
export const ghostsEffect = new GhostsEffect
export const lanternsEffect = new LanternsEffect
export const tendrilsEffect = new TendrilsEffect
/** every effect there is, by the orb it belongs to */
export const fusionEffects = [batsEffect, candyEffect, lanternsEffect, bloodEffect, eyesEffect, tendrilsEffect, ghostsEffect] as const

export type {EffectShow, default as FusionEffect} from './base/FusionEffect.ts'

import HalloweenOrb from './halloween/HalloweenOrb.ts'
import HorrorOrb from './horror/HorrorOrb.ts'
import SpookOrb from './spook/SpookOrb.ts'
import TransparentOrb from './transparent/TransparentOrb.ts'

/** the radius of every orb’s ball, in meters */
export const orbRadius = 0.14

export const halloweenOrb = new HalloweenOrb
export const horrorOrb = new HorrorOrb
export const spookOrb = new SpookOrb
export const transparentOrb = new TransparentOrb
export const orbs = [halloweenOrb, horrorOrb, spookOrb, transparentOrb] as const
/** the orbs that rework a work by a prompt of their own */
export const promptOrbs = [halloweenOrb, horrorOrb, spookOrb] as const

export type {default as Orb} from './base/Orb.ts'
export type {default as PromptOrb} from './base/PromptOrb.ts'

import HalloweenOrb from './HalloweenOrb.ts'
import HorrorOrb from './HorrorOrb.ts'
import SpookOrb from './SpookOrb.ts'

/** the radius of every orb’s ball, in meters */
export const orbRadius = 0.14

export const halloweenOrb = new HalloweenOrb
export const horrorOrb = new HorrorOrb
export const spookOrb = new SpookOrb
export const orbs = [halloweenOrb, horrorOrb, spookOrb] as const

export type {default as Orb} from './base/Orb.ts'

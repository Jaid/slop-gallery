import Helmet from './helmet/Helmet.ts'
import Knife from './knife/Knife.ts'
import Pumpkin from './pumpkin/Pumpkin.ts'

export const pumpkin = new Pumpkin
export const knife = new Knife
export const helmet = new Helmet
/** every curio lying about the gallery when a game begins */
export const curios = [pumpkin, knife, helmet] as const

export type {default as Curio} from './base/Curio.ts'

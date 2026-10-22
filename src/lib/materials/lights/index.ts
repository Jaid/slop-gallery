import type {NodeMaterial} from 'three/webgpu'

import IndoorLightsNode from './IndoorLightsNode.ts'
import LanternLightsNode from './LanternLightsNode.ts'
import UnionLightsNode from './UnionLightsNode.ts'

export {default as FilteredLightsNode} from './base/FilteredLightsNode.ts'
export {default as IndoorLightsNode, reachesIndoors} from './IndoorLightsNode.ts'
export {default as LanternLight} from './LanternLight.ts'
export type {LanternBounce, LanternRoof} from './LanternLight.ts'
export {default as LanternLightNode} from './LanternLightNode.ts'
export {default as LanternLightsNode} from './LanternLightsNode.ts'
export {default as UnionLightsNode} from './UnionLightsNode.ts'

const indoors = new IndoorLightsNode

/** Lets the materials of an enclosed space ignore the gallery’s sun, returning them for chaining. */
export function lightIndoors<T extends NodeMaterial>(material: T) {
  return indoors.adopt(material)
}

/** The timber corridor and its stairs are lit by nothing but their own lanterns and globes. */
export const corridorLanterns = new LanternLightsNode('corridor')

/** The window between the Lodge and the corridor: its glass and reveal catch both the Lodge’s lights and the corridor’s lanterns, and mirror the dark around them instead of the gallery’s sky. */
export const lodgeWindowLights = new UnionLightsNode([indoors, corridorLanterns])

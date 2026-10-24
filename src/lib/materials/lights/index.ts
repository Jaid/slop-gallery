import type {NodeMaterial} from 'three/webgpu'

import IndoorLightsNode from './IndoorLightsNode.ts'

export {default as FilteredLightsNode} from './base/FilteredLightsNode.ts'
export {default as IndoorLightsNode, reachesIndoors} from './IndoorLightsNode.ts'

const indoors = new IndoorLightsNode

/** Lets the materials of an enclosed space ignore the gallery’s sun, returning them for chaining. */
export function lightIndoors<T extends NodeMaterial>(material: T) {
  return indoors.adopt(material)
}

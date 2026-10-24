import type {NodeMaterial} from 'three/webgpu'

import {Box3, Vector3} from 'three/webgpu'

import lobby from '../../gallery/lobby.ts'
import IndoorLightsNode from './IndoorLightsNode.ts'
import LanternLightsNode from './LanternLightsNode.ts'
import RoomLightsNode from './RoomLightsNode.ts'
import UnionLightsNode from './UnionLightsNode.ts'

export {default as FilteredLightsNode} from './base/FilteredLightsNode.ts'
export {default as IndoorLightsNode, reachesIndoors} from './IndoorLightsNode.ts'
export {default as LanternLightsNode} from './LanternLightsNode.ts'
export {default as RoomLightsNode} from './RoomLightsNode.ts'
export {default as UnionLightsNode} from './UnionLightsNode.ts'

const indoors = new IndoorLightsNode

/** Lets the materials of an enclosed space ignore the gallery’s sun, returning them for chaining. */
export function lightIndoors<T extends NodeMaterial>(material: T) {
  return indoors.adopt(material)
}

/** The Lobby’s fountain is lit by the Lobby’s own lamps, the sun and the fill, not by the colored lamps of the tunnel running under its floor. */
export const lobbyLights = new RoomLightsNode(new Box3(new Vector3(-lobby.width / 2, -0.5, lobby.northZ), new Vector3(lobby.width / 2, 30, lobby.southZ)))

/** The timber corridor and its stairs are lit by nothing but the corridor’s lanterns. */
export const corridorLanterns = new LanternLightsNode('corridor')

/** The window between the Lodge and the corridor: its glass and reveal catch both the Lodge’s lights and the corridor’s lanterns, and mirror the dark around them instead of the gallery’s sky. */
export const lodgeWindowLights = new UnionLightsNode([indoors, corridorLanterns])

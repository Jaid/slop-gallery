import type {PlankLayout} from './planks.ts'

import {MeshStandardNodeMaterial} from 'three/webgpu'

import {worldNormalToView} from './filters.ts'
import {plankBoards} from './planks.ts'

export type PlankOptions = PlankLayout & {
  envMapIntensity: number
  roughness: number
}

/**
 * Matte boards laid in staggered courses (see {@link plankBoards}), mapped by world position so separate meshes continue each other’s joints and grain.
 *
 * Faces pointing up and down both read correctly, which lets one class floor and ceiling a room.
 */
export default class PlankMaterial extends MeshStandardNodeMaterial {
  constructor(readonly options: PlankOptions) {
    super({
      roughness: options.roughness,
      envMapIntensity: options.envMapIntensity,
    })
    const boards = plankBoards(options, options.roughness)
    this.colorNode = boards.color
    this.roughnessNode = boards.roughness
    this.normalNode = worldNormalToView(boards.normal)
  }
}

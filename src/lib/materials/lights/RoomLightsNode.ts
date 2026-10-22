import type {Box3, Light} from 'three/webgpu'

import {Vector3} from 'three/webgpu'

import FilteredLightsNode from './base/FilteredLightsNode.ts'

const position = new Vector3

/**
 * Lights a room’s own surfaces with the lamps standing in it and every light without a place: the sun, the ambient and hemisphere fill.
 *
 * Lamps cast no shadows, so without this a lamp in the tunnel under the Lobby would shine up through the floor and put its colored highlight on a polished surface above it.
 */
export default class RoomLightsNode extends FilteredLightsNode {
  constructor(readonly bounds: Box3) {
    super()
  }

  admits(light: Light) {
    const {isPointLight, isSpotLight, isRectAreaLight} = light as Light & {
      isPointLight?: boolean
      isRectAreaLight?: boolean
      isSpotLight?: boolean
    }
    if (!isPointLight && !isSpotLight && !isRectAreaLight) {
      return true
    }
    return this.bounds.containsPoint(position.setFromMatrixPosition(light.matrixWorld))
  }
}

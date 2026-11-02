import type {FrameSurface} from './frameAttributes.ts'
import type {Node} from 'three/webgpu'

import {color, float, max, mix, mx_noise_float} from 'three/tsl'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

import {heightNormal, visibleDetail} from '../filters.ts'
import {frameSurface as readSurface} from './frameAttributes.ts'
import frameStudio from './frameStudio.ts'

/** a layer painted over the ground: where it lies, 0 to 1, what color it has and how rough it is */
export type PaintLayer = {
  color: Node<'vec3'>
  /** relief in meters over the ground, for raised or incised decoration */
  height?: Float
  mask: Float
  roughness?: number
}

export type FramePaintOptions = {
  color: string
  /** how much dirt has settled in the hollows, 0 to 1 */
  grime?: number
  /** decoration painted or raised over the ground, the last on top */
  layers?: (surface: FrameSurface) => ReadonlyArray<PaintLayer>
  roughness?: number
}

type Float = Node<'float'>

/**
 * Painted or lacquered frames: a ground color darkened in the hollows, with any number of painted or raised layers on top, which read the frame’s attributes like the gilding does.
 */
export default class FramePaintMaterial extends MeshPhysicalNodeMaterial {
  constructor({color: ground, grime = 0.4, layers, roughness = 0.55}: FramePaintOptions) {
    super({
      roughness,
      envMap: frameStudio,
      envMapIntensity: 0.8,
    })
    const surface = readSurface()
    const p = surface.position
    const footprint = max(p.x.fwidth(), p.y.fwidth()).max(p.z.fwidth()).toVar('paintFootprint')
    const hollow = surface.cavity.smoothstep(0.1, 0.8)
    const mottle = mx_noise_float(p.mul(9).add(surface.piece.mul(2))).mul(0.5).add(0.5)
    let surfaceColor: Node<'vec3'> = color(ground).mul(mottle.mul(0.08).add(0.96)).mul(float(1).sub(hollow.mul(grime * 0.4)))
    let surfaceRoughness: Float = float(roughness).add(hollow.mul(grime * 0.15))
    let height: Float = mx_noise_float(p.mul(260)).mul(0.00001).mul(visibleDetail(footprint, 0.004))
    for (const layer of layers?.(surface) ?? []) {
      surfaceColor = mix(surfaceColor, layer.color, layer.mask)
      surfaceRoughness = mix(surfaceRoughness, float(layer.roughness ?? roughness), layer.mask)
      if (layer.height) {
        height = height.add(layer.height)
      }
    }
    this.colorNode = surfaceColor
    this.roughnessNode = surfaceRoughness
    this.normalNode = heightNormal(height)
  }
}

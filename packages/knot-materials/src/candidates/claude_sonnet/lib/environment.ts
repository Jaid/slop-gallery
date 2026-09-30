import type {Triple} from '../../../lib/Triple.ts'
import type {Node} from 'three/webgpu'

import {asin, atan, cameraWorldMatrix, exp, float, Fn, mix, positionViewDirection, round, vec3} from 'three/tsl'

import {TAU} from '../../../lib/TAU.ts'

/** A soft rectangular emitter on the sky sphere, like a window, a softbox or a strip light. */
export type SkyPanel = {
  azimuth: number
  color: Triple
  elevation: number
  halfHeight: number
  halfWidth: number
  intensity: number
/** Window mullions: panes across and up. */
  panes?: [number, number]
/** Edge falloff in normalized panel units. */
  softness?: number
}
export type SkyOptions = {
  /** Bright band hugging the horizon. */
  glow?: {
    color: Triple
    intensity: number
    width: number
  }
  horizon: Triple
  nadir: Triple
  panels: ReadonlyArray<SkyPanel>
  zenith: Triple
}
type RadianceContext = {
  getTextureLevel: () => Node<'float'>
  getUV: () => Node<'vec3'>
}
/** World-space direction from the camera through the current fragment. */
export const viewRayWorld = positionViewDirection.negate().transformDirection(cameraWorldMatrix).normalize()
/** Wrap a radiance function as an image-based-light source. Three.js evaluates it with the reflection direction and the roughness (as `blur`), plus once with the surface normal and blur 1 for diffuse light. */
export function proceduralEnvironment(radiance: (direction: Node<'vec3'>, blur: Node<'float'>) => Node<'vec3'>) {
  return Fn(builder => {
    const context = builder.context as RadianceContext
    return radiance(context.getUV().normalize(), float(context.getTextureLevel()).clamp())
  })()
}
/** Analytic sky dome with gradient, horizon glow and panel emitters; blur widens every feature analytically. */
export function panelSky({zenith, horizon, nadir, glow, panels}: SkyOptions) {
  return (direction: Node<'vec3'>, blur: Node<'float'>): Node<'vec3'> => {
    const y = direction.y
    const azimuth = atan(direction.x, direction.z)
    const elevation = asin(y.clamp(-1, 1))
    const up = y.max(0).pow(0.55)
    const down = y.negate().max(0).pow(0.4)
    let sky: Node<'vec3'> = mix(mix(vec3(...horizon), vec3(...zenith), up), vec3(...nadir), down)
    if (glow) {
      sky = sky.add(vec3(...glow.color).mul(glow.intensity).mul(exp(y.div(glow.width).pow(2).negate())))
    }
    const wide = blur.mul(blur).mul(0.9)
    for (const panel of panels) {
      const softness = float(panel.softness ?? 0.06).add(wide)
      const dAzimuth = azimuth.sub(panel.azimuth)
      const wrapped = dAzimuth.sub(round(dAzimuth.div(TAU)).mul(TAU))
      const nx = wrapped.mul(elevation.cos()).div(panel.halfWidth)
      const ny = elevation.sub(panel.elevation).div(panel.halfHeight)
      const edge = nx.abs().max(ny.abs())
      let mask = edge.smoothstep(softness.oneMinus(), softness.add(1)).oneMinus()
      if (panel.panes) {
        const [across, upward] = panel.panes
        const gx = nx.mul(0.5).add(0.5).mul(across).fract().sub(0.5).abs().mul(2)
        const gy = ny.mul(0.5).add(0.5).mul(upward).fract().sub(0.5).abs().mul(2)
        const bar = gx.max(gy).smoothstep(0.86, 0.96).mul(blur.oneMinus())
        mask = mask.mul(bar.oneMinus())
      }
      sky = sky.add(vec3(...panel.color).mul(panel.intensity).mul(mask).div(wide.mul(4).add(1)))
    }
    return sky
  }
}

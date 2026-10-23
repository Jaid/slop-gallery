import type {AntiAliasing} from './antiAliasing.ts'

import {create} from 'zustand'

import {isKnottingham} from '../level.ts'
import {getAntiAliasing} from './antiAliasing.ts'
import {getGraphicsProfile, readCinematicGraphics} from './graphicsMode.ts'

/** Everything the tuning panel changes in the render pipeline. It starts out as the heavy graphics of the page, heavy or cinematic. */
export type CustomGraphics = {
  ambientOcclusion: boolean
  ambientOcclusionRadius: number
  /** ambient occlusion pixels per output pixel along each axis */
  ambientOcclusionResolutionScale: number
  ambientOcclusionSamples: number
  ambientOcclusionScale: number
  ambientOcclusionThickness: number
  antiAliasing: AntiAliasing
  bloom: boolean
  bloomRadius: number
  bloomStrength: number
  bloomThreshold: number
  /** whether a spatial pass smooths the contact shadows */
  contactShadowDenoise: boolean
  contactShadowDistance: number
  contactShadowIntensity: number
  contactShadowQuality: number
  contactShadows: boolean
  contactShadowThickness: number
  /** whether the output dithers by half an 8-bit step, so smooth, dark gradients don’t band */
  dither: boolean
  /** floor reflection pixels per output pixel along each axis */
  reflectionResolutionScale: number
  screenSpaceIndirectLight: boolean
  screenSpaceIndirectLightIntensity: number
  screenSpaceIndirectLightRadius: number
  screenSpaceIndirectLightSlices: number
  screenSpaceIndirectLightSteps: number
  vignette: number
  volumetricLight: boolean
  volumetricLightDensity: number
  volumetricLightMaxDensity: number
  volumetricLightSteps: number
  voxelIndirectLight: boolean
  voxelIndirectLightBounces: number
  voxelIndirectLightIntensity: number
}

export type CustomGraphicsKey = keyof CustomGraphics

/** the knobs that change which passes the pipeline has, so changing one builds it anew; every other knob is a uniform that changes live */
export const customGraphicsStructure = ['ambientOcclusion', 'ambientOcclusionResolutionScale', 'antiAliasing', 'bloom', 'contactShadowDenoise', 'contactShadows', 'dither', 'reflectionResolutionScale', 'screenSpaceIndirectLight', 'volumetricLight', 'voxelIndirectLight'] as const satisfies Array<CustomGraphicsKey>

export type CustomGraphicsStructure = Pick<CustomGraphics, typeof customGraphicsStructure[number]>

export type CustomGraphicsUniform = {[Key in CustomGraphicsKey]: CustomGraphics[Key] extends number ? (Key extends typeof customGraphicsStructure[number] ? never : Key) : never}[CustomGraphicsKey]

/** key that shows or hides the tuning panel with `?development` */
export const graphicsTuningKey = 'KeyG'

/** The pipeline of the page’s heavy graphics, which the panel starts from and resets to. */
export function getDefaultCustomGraphics(): CustomGraphics {
  const profile = getGraphicsProfile(true, readCinematicGraphics())
  return {
    ambientOcclusion: true,
    ambientOcclusionRadius: isKnottingham ? 0.18 : 0.3,
    ambientOcclusionResolutionScale: profile.ambientOcclusionResolutionScale,
    ambientOcclusionSamples: profile.ambientOcclusionSamples,
    ambientOcclusionScale: isKnottingham ? 1.18 : 0.85,
    ambientOcclusionThickness: isKnottingham ? 0.6 : 1,
    antiAliasing: getAntiAliasing(true),
    bloom: true,
    bloomRadius: 0.25,
    bloomStrength: 0.18,
    bloomThreshold: 1,
    contactShadowDenoise: true,
    contactShadowDistance: 0.1,
    contactShadowIntensity: 0.7,
    contactShadowQuality: 1,
    contactShadows: false,
    contactShadowThickness: 0.01,
    dither: profile.volumetricLight,
    reflectionResolutionScale: profile.reflectionResolutionScale,
    screenSpaceIndirectLight: profile.indirectLight,
    screenSpaceIndirectLightIntensity: 4,
    screenSpaceIndirectLightRadius: 12,
    screenSpaceIndirectLightSlices: 3,
    screenSpaceIndirectLightSteps: 16,
    vignette: 0.2,
    volumetricLight: profile.volumetricLight,
    volumetricLightDensity: 8,
    volumetricLightMaxDensity: 3,
    volumetricLightSteps: 120,
    voxelIndirectLight: profile.indirectLight,
    voxelIndirectLightBounces: 2,
    voxelIndirectLightIntensity: 0.05,
  }
}

/** the graphics mode’s own pipeline, read once at startup */
const modeGraphics = getDefaultCustomGraphics()

/** the tuning panel’s values, which stay while the panel is hidden */
export const useCustomGraphics = create<CustomGraphics>(() => modeGraphics)

/** Whether the tuning panel shows, which is the only time the pipeline follows it, and whether focus is in it, which hides the pause menu so the scene shows every change. */
export const useGraphicsTuning = create<{
  focused: boolean
  open: boolean
}>(() => ({
  focused: false,
  open: false,
}))

/** Shows the tuning panel or hides it, which puts the pipeline back to the graphics mode’s own. */
export function toggleGraphicsTuning() {
  useGraphicsTuning.setState(state => ({
    focused: false,
    open: !state.open,
  }))
}

/** The values a pipeline built with `custom` follows: the panel’s while it shows, otherwise the graphics mode’s own. */
export function getTunedGraphics() {
  return useGraphicsTuning.getState().open ? useCustomGraphics.getState() : modeGraphics
}

/** Calls `listener` with the tuned values whenever the panel or its values change, returning the unsubscribe function. */
export function subscribeTunedGraphics(listener: (values: CustomGraphics) => void) {
  const notify = () => listener(getTunedGraphics())
  const unsubscribers = [useCustomGraphics.subscribe(notify), useGraphicsTuning.subscribe(notify)]
  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe()
    }
  }
}

/** Pick the knobs a pipeline is built from. */
export function getCustomGraphicsStructure(state: CustomGraphics): CustomGraphicsStructure {
  return Object.fromEntries(customGraphicsStructure.map(key => [key, state[key]])) as CustomGraphicsStructure
}

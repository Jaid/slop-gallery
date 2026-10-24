import type {LightingTuning} from '../gallery/lighting.ts'
import type {RenderPipelineSettings} from './renderPipelineSettings.ts'

import {create} from 'zustand'

import {getLightingTuning, lightingPresets, useLighting} from '../gallery/lighting.ts'
import {getAntiAliasing} from './antiAliasing.ts'
import {getGraphicsProfile, readCinematicGraphics} from './graphicsMode.ts'
import {getRenderPipelineSettings} from './renderPipelineSettings.ts'

/** key that shows or hides the tuning panel with `?development` */
export const graphicsTuningKey = 'KeyG'

/** everything the tuning panel changes: the render pipeline, and the lighting of levels that follow it */
export type CustomGraphics = LightingTuning & RenderPipelineSettings

/** The pipeline of the page’s heavy graphics, heavy or cinematic, and the lighting of the preset the page starts with, which the panel starts from and resets to. */
export function getDefaultCustomGraphics(): CustomGraphics {
  return {
    ...getRenderPipelineSettings(getGraphicsProfile(true, readCinematicGraphics()), getAntiAliasing(true)),
    ...getLightingTuning(lightingPresets[useLighting.getState().preset]),
  }
}

/** The tuning panel’s values, starting from the graphics mode’s own. They stay in effect while the panel is hidden, so hiding it never rebuilds the pipeline. */
export const useCustomGraphics = create<CustomGraphics>(() => getDefaultCustomGraphics())

/** Whether the tuning panel shows, and whether the pointer is over it, which hides the pause menu so the scene shows every change. */
export const useGraphicsTuning = create<{
  hovered: boolean
  open: boolean
}>(() => ({
  hovered: false,
  open: false,
}))

/** Shows the tuning panel or hides it. */
export function toggleGraphicsTuning() {
  useGraphicsTuning.setState(state => ({
    hovered: false,
    open: !state.open,
  }))
}

/** The values a tunable pipeline follows: the panel’s, whether it shows or not. */
export function getTunedGraphics() {
  return useCustomGraphics.getState()
}

/** Calls `listener` with the tuned values whenever they change, returning the unsubscribe function. */
export function subscribeTunedGraphics(listener: (values: CustomGraphics) => void) {
  return useCustomGraphics.subscribe(listener)
}

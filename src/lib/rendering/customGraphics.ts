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

/** the graphics mode’s own pipeline, read once at startup */
const modeGraphics = getDefaultCustomGraphics()

/** the tuning panel’s values, which stay while the panel is hidden */
export const useCustomGraphics = create<CustomGraphics>(() => modeGraphics)

/** Whether the tuning panel shows, which is the only time the pipeline follows it, and whether the pointer is over it, which hides the pause menu so the scene shows every change. */
export const useGraphicsTuning = create<{
  hovered: boolean
  open: boolean
}>(() => ({
  hovered: false,
  open: false,
}))

/** Shows the tuning panel or hides it, which puts the pipeline back to the graphics mode’s own. */
export function toggleGraphicsTuning() {
  useGraphicsTuning.setState(state => ({
    hovered: false,
    open: !state.open,
  }))
}

/** The values a tunable pipeline follows: the panel’s while it shows, otherwise the graphics mode’s own. */
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

import type {AntiAliasing} from '#src/lib/rendering/antiAliasing.ts'

import {useStore, useThree} from '@react-three/fiber'
import {useLayoutEffect, useMemo} from 'react'
import {useShallow} from 'zustand/react/shallow'

import {galleryEvents} from '#src/lib/gallery/actions.ts'
import {activateRenderPipeline, releaseRenderPipeline} from '#src/lib/rendering/activeRenderPipeline.ts'
import {getCustomGraphicsStructure, getTunedGraphics, useCustomGraphics, useGraphicsTuning} from '#src/lib/rendering/customGraphics.ts'
import GalleryRenderPipeline from '#src/lib/rendering/GalleryRenderPipeline.ts'
import {getInspectionFocus, getInspectionFocusBlur, getInspectionFocusDistance, getInspectionFocusProximity, getPlayerZoom} from '#src/lib/rendering/playerView.ts'

type PostprocessingProps = {
  ambientOcclusionResolutionScale?: number
  ambientOcclusionSamples?: number
  antiAliasing?: AntiAliasing
  contactDarkening?: boolean
  /** whether the pipeline follows the tuned values, which are the graphics mode’s own until the tuning panel changes them */
  custom?: boolean
  /** whether V-viewing blurs the background */
  focus?: boolean
  heavy?: boolean
  indirectLight?: boolean
  reflectionResolutionScale?: number
  volumetricLight?: boolean
}

const Postprocessing = ({ambientOcclusionResolutionScale, ambientOcclusionSamples, antiAliasing = 'traa', contactDarkening = false, custom = false, focus = false, heavy = true, indirectLight = false, reflectionResolutionScale, volumetricLight = false}: PostprocessingProps) => {
  const renderer = useThree(state => state.renderer)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const store = useStore()
  const isTuning = useGraphicsTuning(state => state.open)
  const panelStructure = useCustomGraphics(useShallow(getCustomGraphicsStructure))
  // Compared by value, so showing or hiding the panel only rebuilds the pipeline when its passes differ from the graphics mode’s.
  const structureKey = JSON.stringify(isTuning ? panelStructure : getCustomGraphicsStructure(getTunedGraphics()))
  const structure = useMemo(() => JSON.parse(structureKey) as ReturnType<typeof getCustomGraphicsStructure>, [structureKey])
  const customStructure = custom ? structure : undefined
  // The scene pass renders into targets with their own outputs. Activated after the first frame, every material of the scene would build a second time for them.
  useLayoutEffect(() => {
    const pipeline = new GalleryRenderPipeline(renderer, scene, camera, {
      ambientOcclusionResolutionScale,
      ambientOcclusionSamples,
      antiAliasing,
      contactDarkening,
      custom: customStructure,
      heavy,
      indirectLight,
      reflectionResolutionScale,
      volumetricLight,
      zoom: getPlayerZoom,
      focus: focus ? {
        amount: getInspectionFocus,
        blur: getInspectionFocusBlur,
        distance: getInspectionFocusDistance,
        proximity: getInspectionFocusProximity,
      } : undefined,
    })
    // Antialiasing has to run every frame; otherwise a light pipeline only takes over during inspection focus.
    const isPersistent = heavy || antiAliasing !== false
    const activate = () => {
      activateRenderPipeline(store, pipeline)
    }
    const deactivate = () => {
      releaseRenderPipeline(store, pipeline)
    }
    if (isPersistent || focus && getInspectionFocus() > 0) {
      activate()
    }
    if (!isPersistent && focus) {
      galleryEvents.addEventListener('inspection-focus-start', activate)
      galleryEvents.addEventListener('inspection-focus-end', deactivate)
    }
    return () => {
      if (!isPersistent && focus) {
        galleryEvents.removeEventListener('inspection-focus-start', activate)
        galleryEvents.removeEventListener('inspection-focus-end', deactivate)
      }
      deactivate()
      pipeline.dispose()
    }
  }, [ambientOcclusionResolutionScale, ambientOcclusionSamples, antiAliasing, camera, contactDarkening, customStructure, focus, heavy, indirectLight, reflectionResolutionScale, renderer, scene, store, volumetricLight])
  return null
}
export default Postprocessing

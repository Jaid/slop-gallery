import type {AntiAliasing} from '#src/lib/rendering/antiAliasing.ts'

import {useStore, useThree} from '@react-three/fiber'
import {useLayoutEffect} from 'react'

import {galleryEvents} from '#src/lib/gallery/actions.ts'
import {activateRenderPipeline, releaseRenderPipeline} from '#src/lib/rendering/activeRenderPipeline.ts'
import GalleryRenderPipeline from '#src/lib/rendering/GalleryRenderPipeline.ts'
import {getInspectionFocus, getInspectionFocusBlur, getInspectionFocusDistance, getInspectionFocusProximity, getPlayerZoom} from '#src/lib/rendering/playerView.ts'

type PostprocessingProps = {
  ambientOcclusionResolutionScale?: number
  antiAliasing?: AntiAliasing
  contactDarkening?: boolean
  /** whether V-viewing blurs the background */
  focus?: boolean
  heavy?: boolean
  reflectionResolutionScale?: number
}

const Postprocessing = ({ambientOcclusionResolutionScale, antiAliasing = 'traa', contactDarkening = false, focus = false, heavy = true, reflectionResolutionScale}: PostprocessingProps) => {
  const renderer = useThree(state => state.renderer)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const store = useStore()
  // The scene pass renders into targets with their own outputs. Activated after the first frame, every material of the scene would build a second time for them.
  useLayoutEffect(() => {
    const pipeline = new GalleryRenderPipeline(renderer, scene, camera, {
      ambientOcclusionResolutionScale,
      antiAliasing,
      contactDarkening,
      heavy,
      reflectionResolutionScale,
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
  }, [ambientOcclusionResolutionScale, antiAliasing, camera, contactDarkening, focus, heavy, reflectionResolutionScale, renderer, scene, store])
  return null
}
export default Postprocessing

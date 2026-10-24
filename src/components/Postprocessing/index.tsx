import type {RenderPipelineSettings, RenderPipelineStructure} from '#src/lib/rendering/renderPipelineSettings.ts'

import {useStore, useThree} from '@react-three/fiber'
import {useLayoutEffect, useMemo} from 'react'
import {useShallow} from 'zustand/react/shallow'

import {galleryEvents} from '#src/lib/gallery/actions.ts'
import {getSunReach} from '#src/lib/gallery/sunReach.ts'
import {activateRenderPipeline, releaseRenderPipeline} from '#src/lib/rendering/activeRenderPipeline.ts'
import {useCustomGraphics} from '#src/lib/rendering/customGraphics.ts'
import GalleryRenderPipeline from '#src/lib/rendering/GalleryRenderPipeline.ts'
import {getInspectionFocus, getInspectionFocusBlur, getInspectionFocusDistance, getInspectionFocusProximity, getPlayerZoom} from '#src/lib/rendering/playerView.ts'
import {getRenderPipelineStructure} from '#src/lib/rendering/renderPipelineSettings.ts'
import TunableRenderPipeline from '#src/lib/rendering/TunableRenderPipeline.ts'

type PostprocessingProps = {
  /** whether V-viewing blurs the background */
  focus?: boolean
  heavy?: boolean
  /** the graphics mode’s pipeline */
  settings: RenderPipelineSettings
  /** whether the tuning panel of `?development` can change the pipeline */
  tunable?: boolean
}

const Postprocessing = ({focus = false, heavy = true, settings, tunable = false}: PostprocessingProps) => {
  const renderer = useThree(state => state.renderer)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const store = useStore()
  const panelStructure = useCustomGraphics(useShallow(getRenderPipelineStructure))
  // Compared by value, so a panel change only rebuilds the pipeline when it changes its passes.
  const structureKey = JSON.stringify(tunable ? panelStructure : getRenderPipelineStructure(settings))
  const structure = useMemo(() => JSON.parse(structureKey) as RenderPipelineStructure, [structureKey])
  // The scene pass renders into targets with their own outputs. Activated after the first frame, every material of the scene would build a second time for them.
  useLayoutEffect(() => {
    const options = {
      heavy,
      volumetricLightReach: getSunReach,
      zoom: getPlayerZoom,
      focus: focus ? {
        amount: getInspectionFocus,
        blur: getInspectionFocusBlur,
        distance: getInspectionFocusDistance,
        proximity: getInspectionFocusProximity,
      } : undefined,
    }
    const pipeline = tunable ? new TunableRenderPipeline(renderer, scene, camera, options) : new GalleryRenderPipeline(renderer, scene, camera, {
      ...options,
      settings,
    })
    // Antialiasing has to run every frame; otherwise a light pipeline only takes over during inspection focus.
    const isPersistent = heavy || structure.antiAliasing !== false
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
  }, [camera, focus, heavy, renderer, scene, settings, store, structure, tunable])
  return null
}
export default Postprocessing

import type {AntiAliasing} from '#src/lib/rendering/antiAliasing.ts'

import {useStore, useThree} from '@react-three/fiber'
import {useLayoutEffect} from 'react'

import {galleryEvents} from '#src/lib/gallery/actions.ts'
import {activateRenderPipeline, releaseRenderPipeline} from '#src/lib/rendering/activeRenderPipeline.ts'
import GalleryRenderPipeline from '#src/lib/rendering/GalleryRenderPipeline.ts'
import {getKnotFocus, getKnotFocusDistance, getKnotFocusProximity, getPlayerZoom} from '#src/lib/rendering/playerView.ts'

type PostprocessingProps = {
  antiAliasing?: AntiAliasing
  contactDarkening?: boolean
  heavy?: boolean
  knotFocus?: boolean
}

const Postprocessing = ({antiAliasing = 'traa', contactDarkening = false, knotFocus = false, heavy = true}: PostprocessingProps) => {
  const renderer = useThree(state => state.renderer)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const store = useStore()
  // The scene pass renders into targets with their own outputs. Activated after the first frame, every material of the scene would build a second time for them.
  useLayoutEffect(() => {
    const pipeline = new GalleryRenderPipeline(renderer, scene, camera, {
      antiAliasing,
      contactDarkening,
      heavy,
      zoom: getPlayerZoom,
      focus: knotFocus ? {
        amount: getKnotFocus,
        distance: getKnotFocusDistance,
        proximity: getKnotFocusProximity,
      } : undefined,
    })
    // Antialiasing has to run every frame; otherwise a light pipeline only takes over during knot focus.
    const isPersistent = heavy || antiAliasing !== false
    const activate = () => {
      activateRenderPipeline(store, pipeline)
    }
    const deactivate = () => {
      releaseRenderPipeline(store, pipeline)
    }
    if (isPersistent || knotFocus && getKnotFocus() > 0) {
      activate()
    }
    if (!isPersistent && knotFocus) {
      galleryEvents.addEventListener('knot-focus-start', activate)
      galleryEvents.addEventListener('knot-focus-end', deactivate)
    }
    return () => {
      if (!isPersistent && knotFocus) {
        galleryEvents.removeEventListener('knot-focus-start', activate)
        galleryEvents.removeEventListener('knot-focus-end', deactivate)
      }
      deactivate()
      pipeline.dispose()
    }
  }, [antiAliasing, camera, contactDarkening, knotFocus, heavy, renderer, scene, store])
  return null
}
export default Postprocessing

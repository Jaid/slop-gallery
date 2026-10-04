import {useThree} from '@react-three/fiber/webgpu'
import {useEffect} from 'react'

import {galleryEvents} from '#src/lib/gallery/actions.ts'
import GalleryRenderPipeline from '#src/lib/rendering/GalleryRenderPipeline.ts'
import {getKnotFocus, getKnotFocusDistance, getKnotFocusProximity, getPlayerZoom} from '#src/lib/rendering/playerView.ts'

type PostprocessingProps = {
  contactDarkening?: boolean
  heavy?: boolean
  knotFocus?: boolean
}

const Postprocessing = ({contactDarkening = false, knotFocus = false, heavy = true}: PostprocessingProps) => {
  const renderer = useThree(state => state.renderer)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const set = useThree(state => state.set)
  useEffect(() => {
    const pipeline = new GalleryRenderPipeline(renderer, scene, camera, {
      contactDarkening,
      heavy,
      zoom: getPlayerZoom,
      focus: knotFocus ? {
        amount: getKnotFocus,
        distance: getKnotFocusDistance,
        proximity: getKnotFocusProximity,
      } : undefined,
    })
    const activate = () => set({renderPipeline: pipeline})
    const deactivate = () => {
      set(state => (state.renderPipeline === pipeline ? {renderPipeline: null} : {}))
    }
    if (heavy || knotFocus && getKnotFocus() > 0) {
      activate()
    }
    if (!heavy && knotFocus) {
      galleryEvents.addEventListener('knot-focus-start', activate)
      galleryEvents.addEventListener('knot-focus-end', deactivate)
    }
    return () => {
      if (!heavy && knotFocus) {
        galleryEvents.removeEventListener('knot-focus-start', activate)
        galleryEvents.removeEventListener('knot-focus-end', deactivate)
      }
      deactivate()
      pipeline.dispose()
    }
  }, [camera, contactDarkening, knotFocus, heavy, renderer, scene, set])
  return null
}
export default Postprocessing

import type {Node} from 'three/webgpu'

import {useThree} from '@react-three/fiber/webgpu'
import {useEffect} from 'react'
import {bloom} from 'three/addons/tsl/display/BloomNode.js'
import {gaussianBlur} from 'three/addons/tsl/display/GaussianBlurNode.js'
import {ao} from 'three/addons/tsl/display/GTAONode.js'
import {traa} from 'three/addons/tsl/display/TRAANode.js'
import {float, length, mix, mrt, normalView, output, pass, screenUV, smoothstep, uniform, vec3, vec4, velocity} from 'three/tsl'
import {PerspectiveCamera, RenderPipeline} from 'three/webgpu'

import {galleryEvents} from '#src/lib/gallery/actions.ts'
import knotBokeh from '#src/lib/rendering/knotBokeh.ts'
import {getKnotFocus, getKnotFocusDistance, getKnotFocusProximity, getPlayerZoom} from '#src/lib/rendering/playerView.ts'
import tiltShift from '#src/lib/rendering/tiltShift.ts'

type PostprocessingProps = {
  contactDarkening?: boolean
  knotFocus?: boolean
  quality?: boolean
}

const Postprocessing = ({contactDarkening = false, knotFocus = false, quality = true}: PostprocessingProps) => {
  const renderer = useThree(state => state.renderer)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const set = useThree(state => state.set)
  useEffect(() => {
    const pipeline = new RenderPipeline(renderer)
    // GTAO gathers depth texels; r186 cannot gather a multisampled depth texture.
    const scenePass = pass(scene, camera, {samples: 0})
    scenePass.setMRT(mrt({
      output,
      normal: normalView,
      velocity,
    }))
    const color = scenePass.getTextureNode('output')
    const depth = scenePass.getTextureNode('depth')
    const motion = scenePass.getTextureNode('velocity')
    const viewZ = scenePass.getViewZNode()
    const knotAmount = uniform(0).onRenderUpdate(knotFocus ? getKnotFocus : () => 0)
    const knotDistance = uniform(1).onRenderUpdate(knotFocus ? getKnotFocusDistance : () => 1)
    const knotProximity = uniform(0).onRenderUpdate(knotFocus ? getKnotFocusProximity : () => 0)
    const zoomAmount = uniform(0).onRenderUpdate(quality ? getPlayerZoom : () => 0)
    let base: Node<'vec4'> = color
    let ambientOcclusion: ReturnType<typeof ao> | undefined
    if (quality) {
      const normal = scenePass.getTextureNode('normal')
      ambientOcclusion = ao(depth, normal, camera)
      ambientOcclusion.resolutionScale = 0.75
      ambientOcclusion.radius.value = contactDarkening ? 0.18 : 0.3
      ambientOcclusion.thickness.value = contactDarkening ? 0.6 : 1
      ambientOcclusion.scale.value = contactDarkening ? 1.18 : 0.85
      ambientOcclusion.samples.value = 16
      base = color.mul(vec4(vec3(ambientOcclusion.getTextureNode().r), 1))
    }
    // Preserve a spatial-only source for V-mode background defocus. TRAA may contain
    // reprojected foreground history at disocclusion edges, which must never feed bokeh.
    const bokehSource = base
    let temporalAntialias: ReturnType<typeof traa> | undefined
    if (quality) {
      temporalAntialias = traa(base, depth, motion, camera)
      base = temporalAntialias
    }
    // Z zoom keeps the smooth tilt-shift treatment. Knot inspection uses a separate,
    // depth-aware aperture blur so bright focused pixels cannot leak into the background.
    let zoomBlurPass: ReturnType<typeof gaussianBlur> | undefined
    let shifted = base
    if (quality) {
      zoomBlurPass = gaussianBlur(base, zoomAmount.mul(0.75), 8, {resolutionScale: 1})
      shifted = tiltShift(base, zoomBlurPass, zoomAmount)
    }
    let background: Node<'float'> = float(0)
    let bokehPass: ReturnType<typeof knotBokeh> | undefined
    let focused = shifted
    if (knotFocus && camera instanceof PerspectiveCamera) {
      const bokehRadius = knotProximity.mul(knotProximity).mul(knotProximity).mul(26).add(8)
      bokehPass = knotBokeh(bokehSource, depth, knotDistance, knotAmount, bokehRadius, camera.near, camera.far, () => getKnotFocus() > 0.001)
      // Switch away from TRAA immediately behind the Knot. The bokeh pass itself controls
      // how much defocus to apply with depth, so a wide composite ramp only preserves ghosts.
      background = smoothstep(knotDistance.add(0.12), knotDistance.add(0.32), viewZ.negate()).mul(knotAmount)
      focused = mix(shifted, bokehPass, background)
    }
    let bloomPass: ReturnType<typeof bloom> | undefined
    if (quality) {
      bloomPass = bloom(focused, 0.18, 0.25, 1)
      const edge = smoothstep(float(0.26), float(0.78), length(screenUV.sub(0.5)))
      const vignette = float(1).sub(edge.mul(0.2))
      // During Knot inspection the aperture pass already carries defocused highlights.
      // Suppressing bloom on background pixels prevents a second, depth-unaware halo from the sharp Knot.
      const bloomMask = float(1).sub(background)
      pipeline.outputNode = focused.add(bloomPass.mul(bloomMask)).mul(vec4(vec3(vignette), 1))
    } else {
      pipeline.outputNode = focused
    }
    const activate = () => set({renderPipeline: pipeline})
    const deactivate = () => {
      set(state => {
        return state.renderPipeline === pipeline ? {renderPipeline: null} : {}
      })
    }
    if (quality) {
      activate()
    } else if (knotFocus) {
      galleryEvents.addEventListener('knot-focus-start', activate)
      galleryEvents.addEventListener('knot-focus-end', deactivate)
    }
    return () => {
      if (!quality && knotFocus) {
        galleryEvents.removeEventListener('knot-focus-start', activate)
        galleryEvents.removeEventListener('knot-focus-end', deactivate)
      }
      deactivate()
      temporalAntialias?.dispose()
      zoomBlurPass?.dispose()
      bokehPass?.dispose()
      ambientOcclusion?.dispose()
      bloomPass?.dispose()
      scenePass.dispose()
      pipeline.dispose()
    }
  }, [camera, contactDarkening, knotFocus, quality, renderer, scene, set])
  return null
}
export default Postprocessing

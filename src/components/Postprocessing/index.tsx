import type {Node} from 'three/webgpu'

import {useThree} from '@react-three/fiber/webgpu'
import {useEffect} from 'react'
import {bloom} from 'three/addons/tsl/display/BloomNode.js'
import {gaussianBlur} from 'three/addons/tsl/display/GaussianBlurNode.js'
import {ao} from 'three/addons/tsl/display/GTAONode.js'
import {traa} from 'three/addons/tsl/display/TRAANode.js'
import {float, length, max, mix, mrt, normalView, output, pass, screenUV, smoothstep, uniform, vec3, vec4, velocity} from 'three/tsl'
import {RenderPipeline} from 'three/webgpu'

import {galleryEvents} from '#src/lib/gallery/actions.ts'
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
    let temporalAntialias: ReturnType<typeof traa> | undefined
    if (quality) {
      temporalAntialias = traa(base, depth, motion, camera)
      base = temporalAntialias
    }
    // One half-resolution separable Gaussian serves both Z zoom tilt-shift and Knot background focus.
    // Keep the default inspection distance near the old strength while making close views substantially blurrier.
    const knotBlurStrength = knotProximity.mul(knotProximity).mul(knotProximity).mul(3).add(0.75).mul(knotAmount)
    const blurStrength = max(zoomAmount.mul(1.5), knotBlurStrength)
    const blurSigma = 8
    const blurPass = gaussianBlur(base, blurStrength.div(2), blurSigma, {resolutionScale: 1})
    const shifted = quality ? tiltShift(base, blurPass, zoomAmount) : base
    // KnotSpectation supplies the far edge of the Knot's bounding sphere, so only geometry behind it is blurred.
    const background = smoothstep(knotDistance.add(0.2), knotDistance.add(1.35), viewZ.negate()).mul(knotAmount)
    const focused = mix(shifted, blurPass, background)
    let bloomPass: ReturnType<typeof bloom> | undefined
    if (quality) {
      bloomPass = bloom(focused, 0.18, 0.25, 1)
      const edge = smoothstep(float(0.26), float(0.78), length(screenUV.sub(0.5)))
      const vignette = float(1).sub(edge.mul(0.2))
      pipeline.outputNode = focused.add(bloomPass).mul(vec4(vec3(vignette), 1))
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
      blurPass.dispose()
      ambientOcclusion?.dispose()
      bloomPass?.dispose()
      scenePass.dispose()
      pipeline.dispose()
    }
  }, [camera, contactDarkening, knotFocus, quality, renderer, scene, set])
  return null
}
export default Postprocessing

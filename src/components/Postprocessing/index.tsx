import {useThree} from '@react-three/fiber/webgpu'
import {useEffect} from 'react'
import {bloom} from 'three/addons/tsl/display/BloomNode.js'
import {ao} from 'three/addons/tsl/display/GTAONode.js'
import {smaa} from 'three/addons/tsl/display/SMAANode.js'
import {float, length, mrt, normalView, output, pass, screenUV, smoothstep, vec3, vec4} from 'three/tsl'
import {RenderPipeline} from 'three/webgpu'

const Postprocessing = () => {
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
    }))
    const color = scenePass.getTextureNode('output')
    const normal = scenePass.getTextureNode('normal')
    const depth = scenePass.getTextureNode('depth')
    const ambientOcclusion = ao(depth, normal, camera)
    ambientOcclusion.resolutionScale = 0.5
    ambientOcclusion.radius.value = 0.3
    ambientOcclusion.scale.value = 0.85
    ambientOcclusion.samples.value = 16
    const occluded = color.mul(vec4(vec3(ambientOcclusion.getTextureNode().r), 1))
    const bloomPass = bloom(occluded, 0.18, 0.25, 1)
    const edge = smoothstep(float(0.26), float(0.78), length(screenUV.sub(0.5)))
    const vignette = float(1).sub(edge.mul(0.2))
    const antialias = smaa(occluded.add(bloomPass).mul(vec4(vec3(vignette), 1)))
    pipeline.outputNode = antialias
    set({renderPipeline: pipeline})
    return () => {
      set(state => state.renderPipeline === pipeline ? {renderPipeline: null} : {})
      antialias.dispose()
      ambientOcclusion.dispose()
      bloomPass.dispose()
      scenePass.dispose()
      pipeline.dispose()
    }
  }, [camera, renderer, scene, set])
  return null
}
export default Postprocessing

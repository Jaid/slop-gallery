import {useThree} from '@react-three/fiber/webgpu'
import {useEffect} from 'react'

import WireframeRenderPipeline from '#src/lib/rendering/WireframeRenderPipeline.ts'

/** Replace the regular frame with a hidden-line wireframe of the scene. */
const WireframeVision = () => {
  const renderer = useThree(state => state.renderer)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const set = useThree(state => state.set)
  useEffect(() => {
    const pipeline = new WireframeRenderPipeline(renderer, scene, camera)
    set({renderPipeline: pipeline})
    return () => {
      set(state => (state.renderPipeline === pipeline ? {renderPipeline: null} : {}))
      pipeline.dispose()
    }
  }, [camera, renderer, scene, set])
  return null
}
export default WireframeVision

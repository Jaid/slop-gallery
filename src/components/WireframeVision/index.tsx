import {useStore, useThree} from '@react-three/fiber'
import {useEffect} from 'react'

import {activateRenderPipeline, releaseRenderPipeline} from '#src/lib/rendering/activeRenderPipeline.ts'
import WireframeRenderPipeline from '#src/lib/rendering/WireframeRenderPipeline.ts'

/** Replace the regular frame with a hidden-line wireframe of the scene. */
const WireframeVision = () => {
  const renderer = useThree(state => state.renderer)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const store = useStore()
  useEffect(() => {
    const pipeline = new WireframeRenderPipeline(renderer, scene, camera)
    activateRenderPipeline(store, pipeline)
    return () => {
      releaseRenderPipeline(store, pipeline)
      pipeline.dispose()
    }
  }, [camera, renderer, scene, store])
  return null
}
export default WireframeVision

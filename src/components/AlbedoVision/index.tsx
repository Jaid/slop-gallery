import {useStore, useThree} from '@react-three/fiber'
import {useLayoutEffect} from 'react'

import {activateRenderPipeline, releaseRenderPipeline} from '#src/lib/rendering/activeRenderPipeline.ts'
import AlbedoRenderPipeline from '#src/lib/rendering/AlbedoRenderPipeline.ts'

/** Replace the regular frame with every surface’s unlit color. */
const AlbedoVision = () => {
  const renderer = useThree(state => state.renderer)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const store = useStore()
  // The scene pass renders with outputs of its own. Activated after the first frame, every material of the scene would build a second time for them.
  useLayoutEffect(() => {
    const pipeline = new AlbedoRenderPipeline(renderer, scene, camera)
    activateRenderPipeline(store, pipeline)
    return () => {
      releaseRenderPipeline(store, pipeline)
      pipeline.dispose()
    }
  }, [camera, renderer, scene, store])
  return null
}
export default AlbedoVision

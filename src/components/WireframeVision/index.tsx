import {useStore, useThree} from '@react-three/fiber'
import {WireframeRenderPipeline} from 'capture-session'
import {useEffect, useState} from 'react'

import {activateRenderPipeline, releaseRenderPipeline} from '#src/lib/rendering/activeRenderPipeline.ts'
import {readWireframeHighlight} from '#src/lib/rendering/wireframeHighlight.ts'

/** Replace the regular frame with a hidden-line wireframe of the scene. */
const WireframeVision = () => {
  const renderer = useThree(state => state.renderer)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const store = useStore()
  const [highlight] = useState(() => readWireframeHighlight())
  useEffect(() => {
    const pipeline = new WireframeRenderPipeline(renderer, scene, camera, highlight)
    activateRenderPipeline(store, pipeline)
    return () => {
      releaseRenderPipeline(store, pipeline)
      pipeline.dispose()
    }
  }, [camera, highlight, renderer, scene, store])
  return null
}
export default WireframeVision

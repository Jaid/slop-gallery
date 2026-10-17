import {useFrame, useThree} from '@react-three/fiber'
import {useEffect, useRef} from 'react'

import Player from '#component/Player'
import Portraits from '#component/Portraits'
import WebmcpBridge from '#component/WebmcpBridge'
import {Scene as LevelScene} from '#level/components.ts'
import {useGallery} from '#src/lib/gallery.ts'
import {GalleryRenderer} from '#src/lib/rendering/GalleryRenderer.ts'
import {pendingImages} from '#src/lib/useArtworkTexture.ts'

import Interaction from './Interaction.tsx'

export default function Scene() {
  return <>
    <LevelScene />
    <Portraits />
    <Player />
    <Interaction />
    <WebmcpBridge />
    <Ready />
  </>
}

const maxWarmup = 90_000
/** Holds the loading screen until the artworks are in and every pipeline of the scene, including unseen rooms, shadows and reflections, has compiled. */
function Ready() {
  const frames = useRef(0)
  const loadingSince = useRef<number>(null)
  const renderer = useThree(state => state.renderer)
  const scene = useThree(state => state.scene)
  const galleryRenderer = renderer instanceof GalleryRenderer ? renderer : null
  useEffect(() => () => useGallery.setState({ready: false}), [])
  useEffect(() => {
    if (!galleryRenderer) {
      return
    }
    galleryRenderer.setFrameScene(scene)
    galleryRenderer.setWarming(true)
    return () => {
      galleryRenderer.setWarming(false)
      galleryRenderer.setFrameScene(null)
    }
  }, [galleryRenderer, scene])
  useFrame(() => {
    if (useGallery.getState().ready) {
      return
    }
    loadingSince.current ??= performance.now()
    // A scene that never settles, like one that keeps adding objects, starts after a while anyway. Its late pipelines still compile in the background.
    const warm = galleryRenderer?.warm !== false || performance.now() - loadingSince.current > maxWarmup
    if (warm && galleryRenderer && !galleryRenderer.warm && frames.current === 0) {
      console.warn(`Pipeline warmup gave up after ${maxWarmup / 1000} s with ${galleryRenderer.pendingPipelines} pipelines still compiling.`)
    }
    if (pendingImages() > 0 || !warm) {
      frames.current = 0
      return
    }
    if (++frames.current > 8) {
      galleryRenderer?.setWarming(false)
      useGallery.setState({ready: true})
    }
  })
  return null
}

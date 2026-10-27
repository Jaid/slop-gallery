import {useFrame, useThree} from '@react-three/fiber'
import Branch from 'branch-component'
import {useEffect, useLayoutEffect, useRef} from 'react'

import AmbienceEmitterMarkers from '#component/AmbienceEmitterMarkers'
import AmbienceListener from '#component/AmbienceListener'
import LightLevels from '#component/LightLevels'
import LightMarkers from '#component/LightMarkers'
import Player from '#component/Player'
import Portraits from '#component/Portraits'
import PortraitSlotEditor from '#component/PortraitSlotEditor'
import PortraitSlots from '#component/PortraitSlots'
import WebmcpBridge from '#component/WebmcpBridge'
import {Scene as LevelScene} from '#level/components.ts'
import {isShowingAmbienceEmitters} from '#src/lib/audio/ambience/ambienceEmitters.ts'
import {useGallery} from '#src/lib/gallery.ts'
import {isEditingPortraitSlots, isShowingPortraitSlots} from '#src/lib/gallery/portraitSlotStore.ts'
import {useHiddenUi} from '#src/lib/hiddenUi.ts'
import {GalleryRenderer} from '#src/lib/rendering/GalleryRenderer.ts'
import {isShowingLights} from '#src/lib/rendering/lightLevels.ts'
import {readLoading} from '#src/lib/rendering/loading.ts'
import {pendingImages} from '#src/lib/useArtworkTexture.ts'

import Interaction from './Interaction.tsx'

export default function Scene() {
  const uiHidden = useHiddenUi(state => state.hidden)
  return <>
    <LevelScene />
    <Portraits />
    {/* Hidden with O, the markers keep working: editors still aim, drag and switch what they mark. */}
    <group name='scene-ui' visible={!uiHidden}>
      <Branch if={isShowingPortraitSlots} then={PortraitSlots} />
      <Branch if={isEditingPortraitSlots} then={PortraitSlotEditor} />
      <Branch if={isShowingLights} then={LightMarkers} />
      <Branch if={isShowingAmbienceEmitters} then={AmbienceEmitterMarkers} />
    </group>
    <LightLevels />
    <AmbienceListener />
    <Player />
    <Interaction />
    <WebmcpBridge />
    <Ready />
  </>
}

const maxWarmup = 90_000
const loading = readLoading()
/**
 * Holds the loading screen until the artworks are in and every pipeline of the scene, including unseen rooms, shadows and reflections, has compiled.
 * With `?loading=streamed` or `lazy`, the level’s culling leaves out what the start view can’t see, and the renderer streams it in after the loading screen.
 */
function Ready() {
  const frames = useRef(0)
  const loadingSince = useRef<number>(null)
  const renderer = useThree(state => state.renderer)
  const scene = useThree(state => state.scene)
  const galleryRenderer = renderer instanceof GalleryRenderer ? renderer : null
  useEffect(() => () => useGallery.setState({ready: false}), [])
  // A layout effect runs before the first frame draws the scene. A passive one can wait until after that frame, which then compiles every pipeline of the scene synchronously.
  useLayoutEffect(() => {
    if (!galleryRenderer) {
      return
    }
    galleryRenderer.setFrameScene(scene)
    galleryRenderer.setWarming(true)
    return () => {
      galleryRenderer.setWarming(false)
      galleryRenderer.setStreaming(null)
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
      if (loading !== 'full') {
        galleryRenderer?.setStreaming(loading === 'lazy' ? 'priority' : 'all')
      }
      useGallery.setState({ready: true})
    }
  })
  return null
}

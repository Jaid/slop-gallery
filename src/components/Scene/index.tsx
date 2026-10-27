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
import {pendingRooms} from '#src/lib/gallery/roomLoading.ts'
import {useHiddenUi} from '#src/lib/hiddenUi.ts'
import {GalleryRenderer} from '#src/lib/rendering/GalleryRenderer.ts'
import {isShowingLights} from '#src/lib/rendering/lightLevels.ts'
import {readLoading} from '#src/lib/rendering/loading.ts'
import {telemetry} from '#src/lib/telemetry/index.ts'
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
 * With `?loading=stream`, the default, or `lazy`, the level’s culling leaves out all but the start room, and the renderer streams the rest in after the loading screen. Rooms the level loads on demand count once they have mounted.
 * With `?loading=full`, it holds the loading screen until the artworks are in and every pipeline of the scene, including unseen rooms, shadows and reflections, has compiled.
 * Otherwise, the loading screen only waits until every object of the start room has been drawn once: artworks still decoding and the last pipelines, which compile one after another at about a second each, appear once they are done, with the loading indicator counting them.
 */
function Ready() {
  const frames = useRef(0)
  const loadingSince = useRef<number>(null)
  // When each condition the loading screen waits for last became true, in ms since loading began, or -1 while it is false.
  const milestones = useRef({
    images: -1,
    pipelines: -1,
    warm: -1,
  })
  /** when the next loading.progress event is due, in ms since loading began */
  const nextProgress = useRef(0)
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
    const elapsed = Math.round(performance.now() - loadingSince.current)
    const reached = milestones.current
    const imagesDone = pendingImages() === 0
    const pipelinesDone = galleryRenderer?.pendingPipelines === 0
    const isWarm = galleryRenderer?.warm !== false
    reached.images = imagesDone ? (reached.images < 0 ? elapsed : reached.images) : -1
    reached.pipelines = pipelinesDone ? (reached.pipelines < 0 ? elapsed : reached.pipelines) : -1
    reached.warm = isWarm ? (reached.warm < 0 ? elapsed : reached.warm) : -1
    const warmup: Record<string, number> = galleryRenderer ? {
      'loading.warmup_build_ms': Math.round(galleryRenderer.warmup.buildMs),
      'loading.warmup_frames': galleryRenderer.warmup.frames,
      'loading.warmup_objects': galleryRenderer.warmup.objects,
    } : {}
    if (telemetry && elapsed >= nextProgress.current) {
      nextProgress.current = elapsed + 1000
      telemetry.event('loading.progress', {
        'loading.images': pendingImages(),
        'loading.mode': loading,
        'loading.ms': elapsed,
        'loading.pipelines': galleryRenderer?.pendingPipelines ?? 0,
        ...warmup,
      })
    }
    // A scene that never settles, like one that keeps adding objects, starts after a while anyway. Its late pipelines still compile in the background.
    const settled = loading === 'full' ? galleryRenderer?.warm !== false : galleryRenderer?.warmedAll !== false
    const warm = settled || performance.now() - loadingSince.current > maxWarmup
    if (warm && galleryRenderer && !settled && frames.current === 0) {
      console.warn(`Pipeline warmup gave up after ${maxWarmup / 1000} s with ${galleryRenderer.pendingPipelines} pipelines still compiling.`)
    }
    if (!(imagesDone || loading !== 'full') || !warm || pendingRooms() > 0) {
      frames.current = 0
      return
    }
    if (++frames.current > 8) {
      galleryRenderer?.setWarming(false)
      if (loading !== 'full') {
        galleryRenderer?.setStreaming(loading === 'lazy' ? 'priority' : 'all')
      }
      telemetry?.event('loading.finished', {
        'loading.images_ms': reached.images,
        'loading.mode': loading,
        'loading.ms': elapsed,
        'loading.pipelines_ms': reached.pipelines,
        'loading.warm_ms': reached.warm,
        ...warmup,
      })
      useGallery.setState({ready: true})
    }
  })
  return null
}

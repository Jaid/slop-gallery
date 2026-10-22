import type {LightingPreset} from '#src/lib/gallery/lighting.ts'
import type {CanvasTexture, DirectionalLight, Light, Renderer, Scene} from 'three/webgpu'

import {useThree} from '@react-three/fiber'
import renderCanvasTexture from 'canvas-textures/three'
import {useEffect, useLayoutEffect, useRef, useState} from 'react'
import {EquirectangularReflectionMapping, SRGBColorSpace} from 'three/webgpu'

import {isDevelopmentMode} from '#src/lib/developmentMode.ts'
import {isTextInput, notify, rooms, useGallery} from '#src/lib/gallery.ts'
import {cycleLighting, lightingPresets, useLighting} from '#src/lib/gallery/lighting.ts'
import lobbyVault from '#src/lib/gallery/lobbyVault.ts'
import proceduralSky, {SkyLook} from '#src/lib/materials/ProceduralSky.ts'
import {lightGain} from '#src/lib/rendering/lightLevels.ts'

/** key that cycles the lighting presets with `?development`, backwards with Shift */
export const lightingCycleKey = 'KeyL'

const lobby = rooms.find(room => room.id === 'lobby')!
/** Where light markers show the sun, which has no position of its own: 2 m above the crown of the Lobby’s vault. */
const sunMarker = [lobby.center[0], lobbyVault.crownY + 2, lobby.center[1]] as const

type Lamp = Light & {
  isPointLight?: boolean
  isSpotLight?: boolean
}

/**
 * The gallery’s lighting: sun, sky, ambient fill, reflection environment and the strength of the rooms’ lamps, all following the current {@link useLighting} preset.
 * Switching presets only changes colors, intensities, uniforms and the environment’s pixels, never which lights exist, so no material recompiles.
 */
export default function GalleryLighting() {
  const preset = lightingPresets[useLighting(s => s.preset)]
  const scene = useThree(s => s.scene)
  const renderer = useThree(s => s.renderer)
  const sunLight = useRef<DirectionalLight>(null)
  const [look] = useState(() => new SkyLook({
    ...preset.sky,
    sunDirection: preset.sun.direction,
  }))
  const environment = useRef<CanvasTexture>(null)
  // Like the environment, the background is set before the first frame, so the pipelines are compiled once.
  useLayoutEffect(() => {
    const previous = scene.backgroundNode
    // eslint-disable-next-line react-hooks/immutability -- the scene background belongs to the level; the cleanup restores it.
    scene.backgroundNode = proceduralSky(look)
    return () => {
      scene.backgroundNode = previous
    }
  }, [scene, look])
  // The environment is part of every lit material’s cache key. Set after the first frame, it would build all of them a second time; a preset only redraws its pixels.
  useLayoutEffect(() => {
    const texture = renderCanvasTexture({
      width: 1024,
      height: 512,
      draw: () => {},
    }) as CanvasTexture
    texture.mapping = EquirectangularReflectionMapping
    texture.colorSpace = SRGBColorSpace
    environment.current = texture
    const restore = setEnvironment(scene, texture)
    return () => {
      restore()
      environment.current = null
      texture.dispose()
    }
  }, [scene])
  useLayoutEffect(() => {
    look.set({
      ...preset.sky,
      sunDirection: preset.sun.direction,
    })
    if (environment.current) {
      drawEnvironment(environment.current, preset.environment)
    }
    applyExposure(scene, renderer, preset)
    const light = sunLight.current
    if (light) {
      const camera = light.shadow.camera
      Object.assign(camera, {
        left: preset.sun.shadow.left,
        right: preset.sun.shadow.right,
        bottom: preset.sun.shadow.bottom,
        top: preset.sun.shadow.top,
        near: preset.sun.shadow.near,
        far: preset.sun.shadow.far,
      })
      camera.updateProjectionMatrix()
      light.shadow.needsUpdate = true
    }
  }, [preset, look, scene, renderer])
  // Lamps glow by the preset’s gain. The corridor’s lanterns already light a space of their own, without any of the daylight’s fill, and daylight is no lamp.
  useLayoutEffect(() => {
    lightGain.current = light => {
      const lamp = light as Lamp
      return (lamp.isPointLight || lamp.isSpotLight) && !lamp.userData.daylight ? preset.lamps : 1
    }
    return () => {
      lightGain.current = () => 1
    }
  }, [preset])
  useEffect(() => {
    if (!isDevelopmentMode) {
      return
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isTextInput(event.target) || useGallery.getState().panel) {
        return
      }
      if (event.code === lightingCycleKey) {
        notify(`Lighting: ${cycleLighting(event.shiftKey ? -1 : 1).title}`)
      }
    }
    globalThis.addEventListener('keydown', keydown)
    return () => {
      globalThis.removeEventListener('keydown', keydown)
    }
  }, [])
  const {sun} = preset
  return <>
    <ambientLight color={preset.ambient.color} intensity={preset.ambient.intensity} />
    <hemisphereLight color={preset.hemisphere.color} groundColor={preset.hemisphere.ground} intensity={preset.hemisphere.intensity} />
    <directionalLight castShadow color={sun.color} intensity={sun.intensity} name='sun' position={sun.position} shadow-camera-bottom={sun.shadow.bottom} shadow-camera-far={sun.shadow.far} shadow-camera-left={sun.shadow.left} shadow-camera-near={sun.shadow.near} shadow-camera-right={sun.shadow.right} shadow-camera-top={sun.shadow.top} shadow-mapSize={[sun.shadow.mapSize, sun.shadow.mapSize]} shadow-normalBias={sun.shadow.normalBias} userData={{marker: sunMarker}} ref={sunLight} />
  </>
}

/** Paints the reflection environment: a vertical gradient with four bright light boxes in its upper band. */
function drawEnvironment(texture: CanvasTexture, {gradient: stops, lightBoxes}: LightingPreset['environment']) {
  const canvas = texture.image as HTMLCanvasElement | OffscreenCanvas
  const context = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  const gradient = context.createLinearGradient(0, 0, 0, 512)
  for (const [index, offset] of [0, 0.4, 0.55, 1].entries()) {
    gradient.addColorStop(offset, stops[index])
  }
  context.fillStyle = gradient
  context.fillRect(0, 0, 1024, 512)
  context.fillStyle = lightBoxes
  for (let i = 0; i < 4; i++) {
    context.fillRect(i * 256 + 35, 50, 90, 100)
  }
  texture.needsUpdate = true
  texture.needsPMREMUpdate = true
}
/** Sets the scene’s environment, returning how to restore the previous one. R3F expects it to be set from an effect. */
function setEnvironment(scene: Scene, texture: CanvasTexture) {
  const previous = scene.environment
  scene.environment = texture
  return () => {
    scene.environment = previous
  }
}
/** The scene’s environment intensity and the exposure belong to the level’s lighting, like the environment itself. */
function applyExposure(scene: Scene, renderer: Renderer, preset: LightingPreset) {
  scene.environmentIntensity = preset.environment.intensity
  renderer.toneMappingExposure = preset.exposure
}

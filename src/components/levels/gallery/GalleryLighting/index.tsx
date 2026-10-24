import type {GalleryLightingPreset, LightingPreset} from '#src/lib/gallery/lighting.ts'
import type {CanvasTexture, DirectionalLight, Light, Renderer, Scene} from 'three/webgpu'

import {useThree} from '@react-three/fiber'
import renderCanvasTexture from 'canvas-textures/three'
import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react'
import {EquirectangularReflectionMapping, SRGBColorSpace} from 'three/webgpu'
import useGraphicsMode, {useGraphicsModeValue} from 'use-graphics-mode'
import {useShallow} from 'zustand/react/shallow'

import {isDevelopmentMode} from '#src/lib/developmentMode.ts'
import {isTextInput, notify, rooms, useGallery} from '#src/lib/gallery.ts'
import {cycleLighting, lightingPresets, pickLightingTuning, tuneLighting, useLighting} from '#src/lib/gallery/lighting.ts'
import lobbyVault from '#src/lib/gallery/lobbyVault.ts'
import proceduralSky, {SkyLook} from '#src/lib/materials/ProceduralSky.ts'
import {getDefaultCustomGraphics, useCustomGraphics} from '#src/lib/rendering/customGraphics.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'
import {lightGain} from '#src/lib/rendering/lightLevels.ts'
import {getShadowProps, useShadowProps} from '#src/lib/rendering/shadowFilters.ts'

/** key that cycles the lighting presets with `?development`, backwards with Shift */
export const lightingCycleKey = 'KeyL'

const lobby = rooms.find(room => room.id === 'lobby')!
/** Where light markers show the sun, which has no position of its own: 2 m above the crown of the Lobby’s vault. */
const sunMarker = [lobby.center[0], lobbyVault.crownY + 2, lobby.center[1]] as const
/** the lighting the tuning panel opens with */
const tuningStart = pickLightingTuning(getDefaultCustomGraphics())

type Lamp = Light & {
  isPointLight?: boolean
  isSpotLight?: boolean
}

/**
 * The gallery’s lighting: sun, sky, ambient fill, reflection environment and the strength of the rooms’ lamps, all following the current {@link useLighting} preset.
 * Switching presets only changes colors, intensities, uniforms and the environment’s pixels, never which lights exist, so no material recompiles.
 */
export default function GalleryLighting() {
  const preset = useTunedLighting(lightingPresets[useLighting(s => s.preset)])
  const scene = useThree(s => s.scene)
  const renderer = useThree(s => s.renderer)
  const sunLight = useRef<DirectionalLight>(null)
  const {samples: sunShadowSamples, ...sunShadow} = useSunShadow(preset.sun.shadow.mapSize)
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
  // Split by what each part reads, so a tuning slider only redoes its own part; redrawing the environment rebuilds its prefiltered maps.
  const {environment: {gradient, intensity: environmentIntensity, lightBoxes}, exposure, sky, sun: {direction: sunDirection, shadow}} = preset
  useLayoutEffect(() => {
    look.set({
      ...sky,
      sunDirection,
    })
  }, [look, sky, sunDirection])
  useLayoutEffect(() => {
    if (environment.current) {
      drawEnvironment(environment.current, gradient, lightBoxes)
    }
  }, [gradient, lightBoxes])
  useLayoutEffect(() => {
    applyExposure(scene, renderer, environmentIntensity, exposure)
  }, [scene, renderer, environmentIntensity, exposure])
  useLayoutEffect(() => {
    const light = sunLight.current
    if (light) {
      const camera = light.shadow.camera
      Object.assign(camera, {
        left: shadow.left,
        right: shadow.right,
        bottom: shadow.bottom,
        top: shadow.top,
        near: shadow.near,
        far: shadow.far,
      })
      camera.updateProjectionMatrix()
      light.shadow.needsUpdate = true
    }
  }, [shadow])
  // Lamps glow by the preset’s gain, and the optional ones not at all with only the essential lamps. The corridor’s lanterns already light a space of their own, without any of the daylight’s fill, and daylight is no lamp.
  const {lamps, lampSet = 'all'} = preset
  useLayoutEffect(() => {
    lightGain.current = light => {
      const lamp = light as Lamp
      if (!(lamp.isPointLight || lamp.isSpotLight) || lamp.userData.daylight) {
        return 1
      }
      return lampSet === 'essential' && lamp.userData.optional ? 0 : lamps
    }
    return () => {
      lightGain.current = () => 1
    }
  }, [lamps, lampSet])
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
    {/* The shadow map resizes in place, but a new filter needs a new shadow, so the sun is built anew. */}
    <directionalLight key={sunShadowSamples} castShadow color={sun.color} intensity={sun.intensity} name='sun' position={sun.position} shadow-camera-bottom={sun.shadow.bottom} shadow-camera-far={sun.shadow.far} shadow-camera-left={sun.shadow.left} shadow-camera-near={sun.shadow.near} shadow-camera-right={sun.shadow.right} shadow-camera-top={sun.shadow.top} shadow-normalBias={sun.shadow.normalBias} userData={{marker: sunMarker}} ref={sunLight} {...sunShadow} />
  </>
}

/** With `?development`, the preset with the lighting the tuning panel changed, which stays after hiding the panel. */
function useTunedLighting(preset: GalleryLightingPreset) {
  const tuning = useCustomGraphics(useShallow(pickLightingTuning))
  return useMemo(() => (isDevelopmentMode ? tuneLighting(preset, tuning, tuningStart) : preset), [preset, tuning])
}
/** The sun’s shadow props, which the tuning panel of `?development` changes in heavy graphics, together with its lookups per pixel. */
function useSunShadow(mapSize: number) {
  const isHeavy = useGraphicsMode()
  const {shadowSamples} = useGraphicsModeValue(getGraphicsProfile)
  const own = useShadowProps(mapSize)
  const tuned = useCustomGraphics(useShallow(state => ({
    mapSize: state.sunShadowMapSize,
    radius: state.sunShadowRadius,
    samples: state.sunShadowSamples,
  })))
  if (isDevelopmentMode && isHeavy) {
    return {
      ...getShadowProps(tuned),
      samples: tuned.samples,
    }
  }
  return {
    ...own,
    samples: shadowSamples,
  }
}
/** Paints the reflection environment: a vertical gradient with four bright light boxes in its upper band. */
function drawEnvironment(texture: CanvasTexture, stops: LightingPreset['environment']['gradient'], lightBoxes: string) {
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
function applyExposure(scene: Scene, renderer: Renderer, environmentIntensity: number, exposure: number) {
  scene.environmentIntensity = environmentIntensity
  renderer.toneMappingExposure = exposure
}

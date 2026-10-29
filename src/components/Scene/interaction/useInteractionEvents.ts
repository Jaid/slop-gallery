import type {Placement} from '#src/lib/gallery.ts'
import type {FirstPose, MutableRef} from './types.ts'
import type {RootState} from '@react-three/fiber'

import {useEffect} from 'react'
import {Euler, Quaternion, Raycaster, Vector2} from 'three/webgpu'

import {enterGallery, galleryEvents, isTextInput, markControlled, useGallery} from '#src/lib/gallery.ts'
import pauseMenu from '#src/lib/pauseMenu.ts'
import world from '#src/worlds/current.ts'

import createGrabController from './grabController.ts'
import teleportToPortrait from './teleportToPortrait.ts'

export default function useInteractionEvents({
  camera,
  controls,
  renderer,
  placement,
  firstPose,
}: {
  camera: RootState['camera']
  controls: RootState['controls']
  firstPose: MutableRef<FirstPose | null>
  placement: MutableRef<Placement | null>
  renderer: RootState['renderer']
}) {
  useEffect(() => pauseMenu.attach(renderer.domElement), [renderer])
  useEffect(() => {
    const grabbing = createGrabController(camera, placement)
    const lock = () => {
      const {locked} = pauseMenu.getSnapshot()
      if (locked === useGallery.getState().locked) {
        return
      }
      useGallery.setState({
        locked,
        activeLabel: null,
      })
      if (!locked) {
        grabbing.cancel()
      } else {
        firstPose.current = {
          position: camera.position.clone(),
          rotation: camera.quaternion.clone(),
        }
      }
    }
    const down = (event: MouseEvent) => {
      if (event.target !== renderer.domElement) {
        return
      }
      if (!document.pointerLockElement) {
        if (event.button === 0) {
          enterGallery()
        }
        return
      }
      if (event.button === 0 || event.button === 2) {
        markControlled()
      }
      if (event.button === 0) {
        grabbing.grab()
      }
      if (event.button === 2 && useGallery.getState().held) {
        grabbing.release(true)
      }
    }
    const mouseup = (event: MouseEvent) => {
      if (event.button === 0) {
        grabbing.release()
      }
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTextInput(event.target)) {
        return
      }
      if (event.repeat) {
        return
      }
      const state = useGallery.getState()
      if (event.code === 'Escape') {
        grabbing.cancel()
      }
      if (!state.locked) {
        return
      }
      if (['KeyQ', 'KeyV'].includes(event.code)) {
        markControlled()
      }
      if (event.code === 'KeyQ' && state.held) {
        grabbing.release(true)
      }
    }
    const mousemove = (event: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement && (event.movementX || event.movementY)) {
        markControlled()
      }
    }
    const onView = (event: Event) => teleportToPortrait(camera, (event as CustomEvent<string>).detail)
    const home = () => {
      grabbing.cancel()
      const spawnRotation = new Quaternion
      galleryEvents.dispatchEvent(new CustomEvent('teleport', {
        detail: {
          feet: true,
          position: [...world.spawn.position],
          rotation: spawnRotation.setFromEuler(new Euler(world.spawn.pitch, world.spawn.yaw, 0, 'YXZ')).toArray(),
        },
      }))
    }
    const importTarget = (x: number, y: number) => {
      const bounds = renderer.domElement.getBoundingClientRect()
      const cursor = new Vector2((x - bounds.left) / bounds.width * 2 - 1, -((y - bounds.top) / bounds.height) * 2 + 1)
      const dropRay = new Raycaster
      dropRay.setFromCamera(cursor, camera)
      return {
        origin: dropRay.ray.origin.toArray(),
        direction: dropRay.ray.direction.toArray(),
      }
    }
    const context = (event: Event) => event.preventDefault()
    const blur = () => {
      grabbing.cancel()
    }
    const unsubscribeMenu = pauseMenu.subscribe(lock)
    lock()
    globalThis.addEventListener('mousedown', down)
    globalThis.addEventListener('mouseup', mouseup)
    globalThis.addEventListener('keydown', keydown)
    document.addEventListener('mousemove', mousemove)
    window.addEventListener('blur', blur)
    renderer.domElement.addEventListener('contextmenu', context)
    galleryEvents.addEventListener('view', onView)
    galleryEvents.addEventListener('home', home)
    useGallery.setState({importTarget})
    galleryEvents.addEventListener('cancel-interaction', grabbing.cancel)
    return () => {
      grabbing.cancel()
      unsubscribeMenu()
      globalThis.removeEventListener('mousedown', down)
      globalThis.removeEventListener('mouseup', mouseup)
      globalThis.removeEventListener('keydown', keydown)
      document.removeEventListener('mousemove', mousemove)
      window.removeEventListener('blur', blur)
      renderer.domElement.removeEventListener('contextmenu', context)
      galleryEvents.removeEventListener('view', onView)
      galleryEvents.removeEventListener('home', home)
      if (useGallery.getState().importTarget === importTarget) {
        useGallery.setState({importTarget: null})
      }
      galleryEvents.removeEventListener('cancel-interaction', grabbing.cancel)
    }
  }, [camera, controls, firstPose, placement, renderer])
}

import type {Placement} from '#src/lib/gallery.ts'
import type {FirstPose, InspectionState, MutableRef} from './types.ts'
import type {RootState} from '@react-three/fiber/webgpu'

import {useEffect} from 'react'
import {Euler, Quaternion, Raycaster, Vector2} from 'three/webgpu'

import {enterGallery, galleryEvents, isTextInput, markControlled, openPanel, useGallery} from '#src/lib/gallery.ts'
import {playerSpawn} from '#src/lib/gallery/PlayerSession.ts'
import portraitObjects from '#src/lib/gallery/portraitObjects.ts'
import {gallerySupportsMap} from '#src/lib/level.ts'
import pauseMenu from '#src/lib/pauseMenu.ts'

import createGrabController from './grabController.ts'
import createInspectionController from './inspectionController.ts'
import useInspectionPointer from './useInspectionPointer.ts'

export default function useInteractionEvents({
  camera,
  controls,
  renderer,
  placement,
  view,
  firstPose,
}: {
  camera: RootState['camera']
  controls: RootState['controls']
  firstPose: MutableRef<FirstPose | null>
  placement: MutableRef<Placement | null>
  renderer: RootState['renderer']
  view: MutableRef<InspectionState | null>
}) {
  useEffect(() => pauseMenu.attach(renderer.domElement), [renderer])
  useInspectionPointer(controls, renderer, view)
  useEffect(() => {
    const grabbing = createGrabController(camera, placement)
    const inspection = createInspectionController(camera, controls, view)
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
        inspection.cancel()
      } else {
        firstPose.current = {
          position: camera.position.clone(),
          rotation: camera.quaternion.clone(),
        }
      }
    }
    const down = (event: MouseEvent) => {
      if (event.target !== renderer.domElement || useGallery.getState().panel) {
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
        inspection.cancel()
      }
      if (event.code === 'Tab' && gallerySupportsMap && !state.panel && state.locked) {
        event.preventDefault()
        openPanel('map')
      }
      if (!state.locked || state.panel) {
        return
      }
      if (['KeyQ', 'KeyV'].includes(event.code)) {
        markControlled()
      }
      if (event.code === 'KeyV' && state.active && portraitObjects.has(state.active)) {
        if (view.current) {
          inspection.cancel()
        } else {
          inspection.begin(state.active)
        }
      }
      if (event.code === 'KeyQ' && state.held) {
        grabbing.release(true)
      }
    }
    const keyup = (event: KeyboardEvent) => {
      if (event.code === 'KeyV') {
        inspection.cancel()
      }
    }
    const onView = (event: Event) => inspection.teleportTo((event as CustomEvent<string>).detail)
    const home = () => {
      grabbing.cancel()
      inspection.stop()
      galleryEvents.dispatchEvent(new CustomEvent('teleport', {
        detail: {
          feet: true,
          position: [...playerSpawn.position],
          rotation: (new Quaternion).setFromEuler(new Euler(playerSpawn.pitch, playerSpawn.yaw, 0, 'YXZ')).toArray(),
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
      inspection.cancel()
    }
    const unsubscribeMenu = pauseMenu.subscribe(lock)
    lock()
    globalThis.addEventListener('mousedown', down)
    globalThis.addEventListener('mouseup', mouseup)
    globalThis.addEventListener('keydown', keydown)
    globalThis.addEventListener('keyup', keyup)
    window.addEventListener('blur', blur)
    renderer.domElement.addEventListener('contextmenu', context)
    galleryEvents.addEventListener('teleport', inspection.stop)
    galleryEvents.addEventListener('view', onView)
    galleryEvents.addEventListener('home', home)
    galleryEvents.addEventListener('cancel-view', inspection.cancel)
    useGallery.setState({importTarget})
    galleryEvents.addEventListener('cancel-interaction', grabbing.cancel)
    return () => {
      grabbing.cancel()
      inspection.stop()
      unsubscribeMenu()
      globalThis.removeEventListener('mousedown', down)
      globalThis.removeEventListener('mouseup', mouseup)
      globalThis.removeEventListener('keydown', keydown)
      globalThis.removeEventListener('keyup', keyup)
      window.removeEventListener('blur', blur)
      renderer.domElement.removeEventListener('contextmenu', context)
      galleryEvents.removeEventListener('teleport', inspection.stop)
      galleryEvents.removeEventListener('view', onView)
      galleryEvents.removeEventListener('home', home)
      galleryEvents.removeEventListener('cancel-view', inspection.cancel)
      if (useGallery.getState().importTarget === importTarget) {
        useGallery.setState({importTarget: null})
      }
      galleryEvents.removeEventListener('cancel-interaction', grabbing.cancel)
    }
  }, [camera, controls, firstPose, placement, renderer, view])
}

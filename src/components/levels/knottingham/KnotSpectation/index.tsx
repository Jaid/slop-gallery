import type {KnotBay} from 'knot-materials/exhibition.ts'

import {useFrame, useThree} from '@react-three/fiber/webgpu'
import knotAnnouncementUrl from 'knot-materials/announcementAssets.ts'
import {knotBays, knotExhibition} from 'knot-materials/exhibition.ts'
import {createKnotGeometry} from 'knot-materials/geometry.ts'
import {useEffect, useRef} from 'react'
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js'
import {MathUtils, PerspectiveCamera, Vector3} from 'three/webgpu'

import {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import KnotNarration from '#src/lib/audio/KnotNarration.ts'
import {narrator} from '#src/lib/audio/narration.ts'
import inspectionPointerSensitivity from '#src/lib/camera/inspectionPointerSensitivity.ts'
import OrbitInspection from '#src/lib/camera/OrbitInspection.ts'
import {cameraPose, galleryEvents, isTextInput, markControlled, setCameraFocused, useGallery} from '#src/lib/gallery.ts'
import {setKnotFocus} from '#src/lib/rendering/playerView.ts'

const exhibits = new Map(knotExhibition.map(item => [`prop-knot-${item.id}`, item]))
const candidateSurfaces = new Map<string, KnotBay>(knotBays.flatMap(bay => [[`preview-${bay.candidate.id}`, bay], [`candidate-sign-${bay.candidate.id}`, bay]] as const))
const inspectionDistanceSpeed = 0.45
const inspectionOrbitSpeed = 1.5
const inspectionFocusSpeed = 8
const baseRadius = (() => {
  const geometry = createKnotGeometry()
  geometry.computeBoundingSphere()
  const radius = geometry.boundingSphere!.radius
  geometry.dispose()
  return radius
})()

type Session = {
  id: string
  orbit: OrbitInspection
  restoreControls: () => void
}

export default function KnotSpectation() {
  const {camera, controls, renderer} = useThree()
  const pointerSpeed = controls instanceof PointerLockControls ? controls.pointerSpeed : 1
  const session = useRef<Session | null>(null)
  const distanceKeys = useRef(new Set<'KeyS' | 'KeyW'>)
  const orbitKeys = useRef(new Set<'KeyA' | 'KeyD'>)
  const precisionPointer = useRef(false)
  const focusAmount = useRef(0)
  const focusPipelineActive = useRef(false)
  const center = useRef(new Vector3)
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || !(controls instanceof PointerLockControls)) {
      return
    }
    const owner = new AbortController
    const announcements = new KnotNarration(narrator, knotAnnouncementUrl)
    const announce = (id: string, repeat = false) => {
      if (!useGallery.getState().sound) {
        return
      }
      const item = exhibits.get(id)
      const candidateBay = candidateSurfaces.get(id)
      const options = {
        id,
        repeat,
        signal: owner.signal,
      }
      if (candidateBay) {
        announcements.enqueueCandidate(candidateBay.candidate, options)
      } else if (item) {
        announcements.enqueue(item, options)
      }
    }
    const finish = (restorePosition: boolean) => {
      const current = session.current
      if (!current) {
        return
      }
      if (restorePosition) {
        current.orbit.restore()
      } else {
        camera.fov = current.orbit.originalFov
        camera.updateProjectionMatrix()
      }
      current.restoreControls()
      distanceKeys.current.clear()
      orbitKeys.current.clear()
      session.current = null
      focusAmount.current = 0
      setKnotFocus(0, 1, 0)
      if (focusPipelineActive.current) {
        focusPipelineActive.current = false
        galleryEvents.dispatchEvent(new Event('knot-focus-end'))
      }
      setCameraFocused(false)
      useGallery.setState({inspecting: null})
    }
    const release = () => {
      distanceKeys.current.clear()
      orbitKeys.current.clear()
      session.current?.orbit.release()
      if (session.current && useGallery.getState().inspecting !== null) {
        useGallery.setState({inspecting: null})
      }
    }
    const down = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTextInput(event.target)) {
        return
      }
      if (event.code === 'KeyC') {
        precisionPointer.current = true
      }
      if (session.current && !session.current.orbit.returning) {
        if (event.code === 'KeyW' || event.code === 'KeyS') {
          event.preventDefault()
          if (!event.repeat) {
            markControlled()
            distanceKeys.current.add(event.code)
          }
          return
        }
        if (event.code === 'KeyA' || event.code === 'KeyD') {
          event.preventDefault()
          if (!event.repeat) {
            markControlled()
            orbitKeys.current.add(event.code)
          }
          return
        }
      }
      if (event.code !== 'KeyV' || event.repeat) {
        return
      }
      const state = useGallery.getState()
      if (!state.locked || state.panel || state.held || !state.active || !controls.isLocked || document.pointerLockElement !== renderer.domElement) {
        return
      }
      const item = exhibits.get(state.active)
      const object = propObjects.get(state.active)
      if (!item || !object?.group.visible) {
        return
      }
      event.preventDefault()
      markControlled()
      if (session.current) {
        if (session.current.id === state.active && session.current.orbit.returning) {
          session.current.orbit.returning = false
          useGallery.setState({inspecting: state.active})
          announce(state.active)
        }
        return
      }
      if (cameraPose.focused) {
        return
      }
      const enabled = controls.enabled
      galleryEvents.dispatchEvent(new Event('release-zoom'))
      controls.enabled = false
      const target = object.group.getWorldPosition(center.current)
      session.current = {
        id: state.active,
        orbit: new OrbitInspection(camera, target, baseRadius + (item.displacement ?? 0)),
        restoreControls: () => {
          controls.enabled = enabled
        },
      }
      focusPipelineActive.current = true
      setKnotFocus(0, camera.position.distanceTo(target) + session.current.orbit.radius, session.current.orbit.getProximity(target))
      galleryEvents.dispatchEvent(new Event('knot-focus-start'))
      setCameraFocused(true)
      useGallery.setState({inspecting: state.active})
      announce(state.active)
    }
    const up = (event: KeyboardEvent) => {
      if (event.code === 'KeyC') {
        precisionPointer.current = false
      }
      if (event.code === 'KeyW' || event.code === 'KeyS') {
        distanceKeys.current.delete(event.code)
      } else if (event.code === 'KeyA' || event.code === 'KeyD') {
        orbitKeys.current.delete(event.code)
      } else if (event.code === 'KeyV') {
        release()
      }
    }
    const move = (event: MouseEvent) => {
      if (!controls.isLocked || document.pointerLockElement !== renderer.domElement) {
        return
      }
      const sensitivity = inspectionPointerSensitivity(0.0015 * controls.pointerSpeed, precisionPointer.current, event.shiftKey)
      session.current?.orbit.addInput(event.movementX * sensitivity, -event.movementY * sensitivity)
    }
    const blur = () => {
      precisionPointer.current = false
      release()
    }
    const teleport = () => {
      finish(false)
    }
    const narrate = (event: Event) => announce((event as CustomEvent<string>).detail, true)
    const narrateModel = (event: Event) => {
      const id = (event as CustomEvent<string>).detail
      const item = exhibits.get(id)
      if (item && useGallery.getState().sound) {
        announcements.enqueueModel(item, {
          id,
          signal: owner.signal,
        })
      }
    }
    const unsubscribe = useGallery.subscribe(state => {
      if (state.panel || !state.locked) {
        release()
      }
    })
    globalThis.addEventListener('keydown', down)
    globalThis.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    document.addEventListener('mousemove', move)
    galleryEvents.addEventListener('cancel-view', release)
    galleryEvents.addEventListener('teleport', teleport)
    galleryEvents.addEventListener('narrate', narrate)
    galleryEvents.addEventListener('narrate-model', narrateModel)
    return () => {
      unsubscribe()
      globalThis.removeEventListener('keydown', down)
      globalThis.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      document.removeEventListener('mousemove', move)
      galleryEvents.removeEventListener('cancel-view', release)
      galleryEvents.removeEventListener('teleport', teleport)
      galleryEvents.removeEventListener('narrate', narrate)
      galleryEvents.removeEventListener('narrate-model', narrateModel)
      finish(true)
      owner.abort()
    }
  }, [camera, controls, renderer])
  useFrame((_, delta) => {
    const current = session.current
    const focusTarget = current && !current.orbit.returning ? 1 : 0
    focusAmount.current = MathUtils.lerp(focusAmount.current, focusTarget, 1 - Math.exp(-Math.min(delta, 0.06) * inspectionFocusSpeed))
    if (!focusTarget && focusAmount.current < 0.002) {
      focusAmount.current = 0
    }
    if (!current) {
      setKnotFocus(focusAmount.current, 1, 0)
      if (!focusAmount.current && focusPipelineActive.current) {
        focusPipelineActive.current = false
        galleryEvents.dispatchEvent(new Event('knot-focus-end'))
      }
      return
    }
    const object = propObjects.get(current.id)
    if (object?.group.visible) {
      object.group.getWorldPosition(center.current)
      const distanceDirection = Number(distanceKeys.current.has('KeyS')) - Number(distanceKeys.current.has('KeyW'))
      const orbitDirection = Number(orbitKeys.current.has('KeyD')) - Number(orbitKeys.current.has('KeyA'))
      current.orbit.adjustDistance(distanceDirection * inspectionDistanceSpeed * delta)
      current.orbit.addInput(orbitDirection * inspectionOrbitSpeed * pointerSpeed * delta, 0)
    } else {
      distanceKeys.current.clear()
      orbitKeys.current.clear()
      current.orbit.release()
      if (useGallery.getState().inspecting !== null) {
        useGallery.setState({inspecting: null})
      }
    }
    const complete = current.orbit.update(center.current, delta)
    if (object?.group.visible && !complete) {
      setKnotFocus(focusAmount.current, camera.position.distanceTo(center.current) + current.orbit.radius, current.orbit.getProximity(center.current))
    }
    if (complete) {
      current.restoreControls()
      distanceKeys.current.clear()
      orbitKeys.current.clear()
      session.current = null
      setCameraFocused(false)
      useGallery.setState({inspecting: null})
    }
  })
  return null
}

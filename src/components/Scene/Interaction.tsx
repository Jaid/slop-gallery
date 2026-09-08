import type {Placement, Vec3} from '#src/lib/gallery.ts'
import type {Group} from 'three/webgpu'

import {useFrame, useThree} from '@react-three/fiber/webgpu'
import {useEffect, useRef} from 'react'
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js'
import {Matrix4, PerspectiveCamera, Quaternion, Raycaster, Vector2, Vector3} from 'three/webgpu'

import PlacementPreview from '#component/PlacementPreview'
import {InspectionLook} from '#src/lib/camera/InspectionLook.ts'
import {cameraPose, chime, dragPose, enterGallery, findPlacement, galleryEvents, isTextInput, markControlled, narrate, notify, openPanel, roomAt, useGallery, wallDistance} from '#src/lib/gallery.ts'
import {isPortraitLabelHit} from '#src/lib/gallery/portraitLabel.ts'

import {propObjects} from './GrabbableProp.tsx'
import {portraitObjects} from './Portrait.tsx'

const up = new Vector3(0, 1, 0)

export default function Interaction() {
  const {camera, renderer, controls} = useThree()
  const ghost = useRef<Group>(null)
  const ray = useRef(new Raycaster)
  const placement = useRef<Placement | null>(null)
  const direction = useRef(new Vector3)
  const cursor = useRef(new Vector2)
  const held = useGallery(s => s.held)
  const artwork = useGallery(s => s.portraits.find(p => p.id === s.held))
  const dragging = useGallery(s => s.dragging)
  const view = useRef<{id: string
    look: InspectionLook
    position: Vector3
    restoreControls: () => void
    returning: boolean
    rotation: Quaternion} | null>(null)
  const previousHeld = useRef<string | null>(null)
  const firstPose = useRef<{position: Vector3
    rotation: Quaternion} | null>(null)
  const introduced = useRef(false)
  const keyboardGrab = useRef(false)
  useEffect(() => {
    if (!(controls instanceof PointerLockControls)) {
      return
    }
    const mousemove = (event: MouseEvent) => {
      if (controls.isLocked && document.pointerLockElement === renderer.domElement && (event.movementX || event.movementY)) {
        markControlled()
      }
      const viewing = view.current
      if (!viewing || viewing.returning || !controls.isLocked || document.pointerLockElement !== renderer.domElement) {
        return
      }
      const sensitivity = 0.002 * controls.pointerSpeed
      viewing.look.addInput(-event.movementX * sensitivity, -event.movementY * sensitivity)
    }
    document.addEventListener('mousemove', mousemove)
    return () => document.removeEventListener('mousemove', mousemove)
  }, [controls, renderer])
  useEffect(() => {
    const cancel = () => {
      const s = useGallery.getState()
      if (s.held) {
        propObjects.get(s.held)?.cancel()
      }
      useGallery.setState({
        held: null,
        placement: null,
      })
      placement.current = null
      keyboardGrab.current = false
    }
    const stopView = () => {
      view.current?.restoreControls()
      view.current = null
      cameraPose.focused = false
      useGallery.setState({inspecting: null})
    }
    const cancelView = () => {
      if (view.current) {
        view.current.returning = true
      }
      useGallery.setState({inspecting: null})
    }
    const lock = () => {
      const locked = document.pointerLockElement === renderer.domElement
      useGallery.setState({
        locked,
        activeLabel: null,
      })
      if (!locked) {
        cancel()
        cancelView()
      } else {
        firstPose.current = {
          position: camera.position.clone(),
          rotation: camera.quaternion.clone(),
        }
      }
    }
    const grab = () => {
      const s = useGallery.getState()
      if (s.held || !s.active || cameraPose.focused) {
        return
      }
      const p = s.portraits.find(p => p.id === s.active)
      if (p?.merging || p?.reserved) {
        return
      }
      useGallery.setState({held: s.active})
      const prop = propObjects.get(s.active)
      if (prop && !prop.grab()) {
        useGallery.setState({held: null})
        keyboardGrab.current = false
        return
      }
      chime(440)
    }
    const release = (throwing = false) => {
      const s = useGallery.getState()
      const id = s.held
      if (!id) {
        return
      }
      const prop = propObjects.get(id)
      if (prop) {
        prop.release(throwing)
        useGallery.setState({
          held: null,
          placement: null,
        })
        keyboardGrab.current = false
        chime(throwing ? 130 : 400)
        return
      }
      const p = s.portraits.find(p => p.id === id)
      if (!p) {
        return
      }
      if (throwing) {
        const d = camera.getWorldDirection(new Vector3)
        const origin = camera.position.toArray()
        const distance = Math.min(1.45, Math.max(0.35, wallDistance(origin, d.toArray()) - 0.4))
        const pos = camera.position.clone().addScaledVector(d, distance)
        s.commit(s.portraits.map(p => p.id === id ? {...p, hung: false, wallId: undefined, orientation: undefined, position: pos.toArray() as Vec3, rotation: Math.atan2(-d.x, -d.z), velocity: d.multiplyScalar(14).add(new Vector3(0, 1.5, 0)).toArray() as Vec3} : p))
        chime(130)
      } else {
        const candidate = findPlacement(camera.position.toArray(), camera.getWorldDirection(new Vector3).toArray(), p.width, p.height, s.portraits, p.id)
        if (candidate?.valid) {
          s.commit(s.portraits.map(p => p.id === id ? {...p, position: candidate.position, rotation: candidate.rotation, wallId: candidate.wallId, hung: true, orientation: undefined, velocity: undefined} : p))
          chime(620)
          notify('Perfectly placed. Probably.')
        } else {
          notify(candidate?.reason ? `No move made. ${candidate.reason}` : 'No move made. Find an empty patch of wall.')
        }
      }
      useGallery.setState({
        held: null,
        placement: null,
      })
      placement.current = null
      keyboardGrab.current = false
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
        grab()
      }
      if (event.button === 2) {
        const s = useGallery.getState()
        if (s.held) {
          release(true)
        } else if (s.active && portraitObjects.has(s.active)) {
          narrate(s.active)
        }
      }
    }
    const mouseup = (event: MouseEvent) => {
      if (event.button === 0 && !keyboardGrab.current) {
        release()
      }
    }
    const beginView = (id: string) => {
      if (useGallery.getState().held || !(controls instanceof PointerLockControls)) {
        return
      }
      const wasEnabled = controls.enabled
      // The spring is the only rotation writer until inspection and its return finish.
      controls.enabled = false
      view.current = {
        id,
        look: new InspectionLook(camera.quaternion),
        restoreControls: () => {
          controls.enabled = wasEnabled
        },
        returning: false,
        position: camera.position.clone(),
        rotation: camera.quaternion.clone(),
      }
      cameraPose.focused = true
      useGallery.setState({inspecting: id})
    }
    const keydown = (event: KeyboardEvent) => {
      if (isTextInput(event.target)) {
        return
      }
      if (event.repeat) {
        return
      }
      const s = useGallery.getState()
      if (event.code === 'Escape') {
        cancel()
        cancelView()
      }
      if (event.code === 'Tab' && !s.panel && s.locked) {
        event.preventDefault()
        openPanel('map')
      }
      if (!s.locked || s.panel) {
        return
      }
      if (['KeyE', 'KeyQ', 'KeyR', 'KeyV'].includes(event.code)) {
        markControlled()
      }
      if (event.code === 'KeyV' && s.active && portraitObjects.has(s.active)) {
        if (view.current) {
          cancelView()
        } else {
          beginView(s.active)
        }
      }
      if (event.code === 'KeyE') {
        if (s.held) {
          release()
        } else {
          keyboardGrab.current = true
          grab()
        }
      }
      if (event.code === 'KeyQ' && s.held) {
        release(true)
      }
      if (event.code === 'KeyR' && s.active) {
        narrate(s.active)
      }
    }
    const keyup = (event: KeyboardEvent) => {
      if (event.code === 'KeyV') {
        cancelView()
      }
    }
    const onView = (event: Event) => {
      const id = (event as CustomEvent<string>).detail
      const p = useGallery.getState().portraits.find(p => p.id === id)
      if (!p?.hung) {
        return
      }
      const normal = new Vector3(Math.sin(p.rotation), 0, Math.cos(p.rotation))
      const distance = camera instanceof PerspectiveCamera ? Math.max(p.height + 0.65, p.width / camera.aspect) / (2 * Math.tan(camera.fov * Math.PI / 360)) * 1.14 : 3
      const position = new Vector3(...p.position).addScaledVector(normal, distance)
      const rotation = (new Quaternion).setFromRotationMatrix((new Matrix4).lookAt(position, new Vector3(...p.position), up))
      galleryEvents.dispatchEvent(new CustomEvent('teleport', {
        detail: {
          position: position.toArray(),
          rotation: rotation.toArray(),
        },
      }))
      notify('You’re in front of the artwork. Step inside to keep exploring.')
    }
    const home = () => {
      cancel()
      stopView()
      galleryEvents.dispatchEvent(new CustomEvent('teleport', {
        detail: {
          position: [0, 1.7, 5.8],
          rotation: [0, 0, 0, 1],
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
      cancel()
      cancelView()
    }
    document.addEventListener('pointerlockchange', lock)
    globalThis.addEventListener('mousedown', down)
    globalThis.addEventListener('mouseup', mouseup)
    globalThis.addEventListener('keydown', keydown)
    globalThis.addEventListener('keyup', keyup)
    window.addEventListener('blur', blur)
    renderer.domElement.addEventListener('contextmenu', context)
    galleryEvents.addEventListener('teleport', stopView)
    galleryEvents.addEventListener('view', onView)
    galleryEvents.addEventListener('home', home)
    galleryEvents.addEventListener('cancel-view', cancelView)
    useGallery.setState({importTarget})
    galleryEvents.addEventListener('cancel-interaction', cancel)
    return () => {
      cancel()
      stopView()
      document.removeEventListener('pointerlockchange', lock)
      globalThis.removeEventListener('mousedown', down)
      globalThis.removeEventListener('mouseup', mouseup)
      globalThis.removeEventListener('keydown', keydown)
      globalThis.removeEventListener('keyup', keyup)
      window.removeEventListener('blur', blur)
      renderer.domElement.removeEventListener('contextmenu', context)
      galleryEvents.removeEventListener('teleport', stopView)
      galleryEvents.removeEventListener('view', onView)
      galleryEvents.removeEventListener('home', home)
      galleryEvents.removeEventListener('cancel-view', cancelView)
      if (useGallery.getState().importTarget === importTarget) {
        useGallery.setState({importTarget: null})
      }
      galleryEvents.removeEventListener('cancel-interaction', cancel)
    }
  }, [camera, controls, renderer])
  useEffect(() => {
    const api = globalThis.__gallery ??= {}
    api.snapshot = () => ({
      webGPU: 'isWebGPUBackend' in renderer.backend && renderer.backend.isWebGPUBackend === true,
      camera: camera.position.toArray(),
      rotation: camera.rotation.toArray(),
      ready: useGallery.getState().ready,
      registered: portraitObjects.size,
      room: useGallery.getState().room,
      placement: placement.current,
      locked: useGallery.getState().locked,
      hasControlled: useGallery.getState().hasControlled,
      held: useGallery.getState().held,
      active: useGallery.getState().active,
      activeLabel: useGallery.getState().activeLabel,
      saveStatus: useGallery.getState().saveStatus,
      props: [...propObjects].map(([id, {body, group}]) => ({
        id,
        position: body.translation(),
        bodyType: body.bodyType(),
        sleeping: body.isSleeping(),
        visualPosition: group.getWorldPosition(new Vector3).toArray(),
        collidersEnabled: Array.from({length: body.numColliders()}, (_, index) => body.collider(index).isEnabled()),
      })),
      portraits: useGallery.getState().portraits.map(p => ({
        id: p.id,
        title: p.title,
        hung: p.hung,
        position: p.position,
        wallId: p.wallId,
        width: p.width,
        height: p.height,
        pending: p.pending,
        merging: p.merging,
        reserved: p.reserved,
        physical: portraitObjects.get(p.id)?.body.translation(),
      })),
    })
    if (new URLSearchParams(location.search).get('test') === 'true') {
      api.teleport = (position: Vec3, rotation: Array<number>) => galleryEvents.dispatchEvent(new CustomEvent('teleport', {
        detail: {
          position,
          rotation,
        },
      }))
      api.merge = (first: string, second: string) => galleryEvents.dispatchEvent(new CustomEvent('merge', {detail: [first, second]}))
    }
    return () => {
      delete api.snapshot
      delete api.teleport
      delete api.merge
    }
  }, [camera])
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.06)
    const s = useGallery.getState()
    if (s.locked && !introduced.current && firstPose.current && (camera.position.distanceTo(firstPose.current.position) > 0.12 || camera.quaternion.angleTo(firstPose.current.rotation) > 0.1)) {
      introduced.current = true
      narrate('__intro')
    }
    if (previousHeld.current !== s.held) {
      placement.current = null
      previousHeld.current = s.held
    }
    const viewing = view.current
    if (viewing) {
      const p = s.portraits.find(p => p.id === viewing.id)
      if (!p?.hung) {
        viewing.returning = true
      }
      let target = viewing.position
      let rotation = viewing.rotation
      if (!viewing.returning && p) {
        const normal = new Vector3(Math.sin(p.rotation), 0, Math.cos(p.rotation))
        const distance = camera instanceof PerspectiveCamera ? Math.max(p.height + 0.4, p.width / camera.aspect) / (2 * Math.tan(camera.fov * Math.PI / 360)) * 1.14 : 3
        target = new Vector3(...p.position).addScaledVector(normal, distance)
        rotation = (new Quaternion).setFromRotationMatrix((new Matrix4).lookAt(target, new Vector3(...p.position), up))
      }
      camera.position.lerp(target, s.motion ? 1 - Math.exp(-dt * 8) : 1)
      camera.quaternion.copy(viewing.look.update(rotation, dt, s.motion))
      if (viewing.returning && camera.position.distanceTo(target) < 0.01 && camera.quaternion.angleTo(rotation) < 0.005) {
        viewing.restoreControls()
        view.current = null
        cameraPose.focused = false
      }
    }
    camera.getWorldDirection(direction.current)
    cameraPose.position = camera.position.toArray()
    cameraPose.direction = direction.current.toArray()
    const room = roomAt(cameraPose.position)
    if (room !== s.room) {
      useGallery.setState({room})
    }
    cursor.current.set(0, 0)
    if (dragPose.active) {
      const bounds = renderer.domElement.getBoundingClientRect()
      cursor.current.set((dragPose.x - bounds.left) / bounds.width * 2 - 1, -((dragPose.y - bounds.top) / bounds.height) * 2 + 1)
    }
    ray.current.setFromCamera(cursor.current, camera)
    ray.current.far = 9
    if (!dragPose.active) {
      let closest = wallDistance(cameraPose.position, cameraPose.direction)
      let active: string | null = null
      let activeLabel: string | null = null
      for (const [id, object] of [...portraitObjects, ...propObjects]) {
        if (id === s.held || !object.group.visible) {
          continue
        }
        const p = s.portraits.find(p => p.id === id)
        if (p?.reserved) {
          continue
        }
        const hits = ray.current.intersectObject(object.group, true)
        if (hits[0] && hits[0].distance < closest) {
          closest = hits[0].distance
          active = id
          activeLabel = s.locked && !s.panel && p?.hung && isPortraitLabelHit(hits[0].object, object.group) ? id : null
        }
      }
      if (active !== s.active || activeLabel !== s.activeLabel) {
        useGallery.setState({
          active,
          activeLabel,
        })
      }
    } else if (s.activeLabel) {
      useGallery.setState({activeLabel: null})
    }
    if (!ghost.current) {
      return
    }
    const p = s.portraits.find(p => p.id === s.held)
    if (!p && !dragPose.active) {
      ghost.current.visible = false
      placement.current = null
      return
    }
    const candidate = findPlacement(ray.current.ray.origin.toArray(), ray.current.ray.direction.toArray(), p?.width ?? 2.4, p?.height ?? 2.4, s.portraits, p?.id)
    placement.current = candidate
    if (candidate?.valid !== s.placement?.valid || candidate?.inReach !== s.placement?.inReach || candidate?.reason !== s.placement?.reason || candidate?.wallId !== s.placement?.wallId || !candidate && s.placement) {
      useGallery.setState({placement: candidate})
    }
    ghost.current.visible = !!candidate
    if (candidate) {
      ghost.current.position.set(...candidate.position)
      ghost.current.rotation.set(0, candidate.rotation, 0)
    }
  })
  return <group ref={ghost} visible={false}>
    {(artwork || dragging) && !held?.startsWith('prop-') && <PlacementPreview key={artwork?.id ?? 'import'} width={artwork?.width ?? 2.4} height={artwork?.height ?? 2.4} source={artwork?.source} title={artwork?.title} creator={artwork?.creator} pending={artwork?.pending}/>}
  </group>
}

import type {InspectionState, MutableRef} from './types.ts'
import type {RootState} from '@react-three/fiber/webgpu'

import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js'
import {Matrix4, PerspectiveCamera, Quaternion, Vector3} from 'three/webgpu'

import InspectionLook from '#src/lib/camera/InspectionLook.ts'
import {galleryEvents, notify, setCameraFocused, useGallery} from '#src/lib/gallery.ts'

const up = new Vector3(0, 1, 0)

export default function createInspectionController(camera: RootState['camera'], controls: RootState['controls'], view: MutableRef<InspectionState | null>) {
  const stop = () => {
    view.current?.restoreControls()
    view.current = null
    setCameraFocused(false)
    useGallery.setState({inspecting: null})
  }
  const cancel = () => {
    if (view.current) {
      view.current.returning = true
    }
    useGallery.setState({inspecting: null})
  }
  const begin = (id: string) => {
    if (useGallery.getState().held || !(controls instanceof PointerLockControls)) {
      return
    }
    const wasEnabled = controls.enabled
    galleryEvents.dispatchEvent(new Event('release-zoom'))
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
    setCameraFocused(true)
    useGallery.setState({inspecting: id})
  }
  const teleportTo = (id: string) => {
    const portrait = useGallery.getState().portraits.find(candidate => candidate.id === id)
    if (!portrait?.hung) {
      return
    }
    const normal = new Vector3(Math.sin(portrait.rotation), 0, Math.cos(portrait.rotation))
    galleryEvents.dispatchEvent(new Event('release-zoom'))
    const distance = camera instanceof PerspectiveCamera ? Math.max(portrait.height + 0.65, portrait.width / camera.aspect) / (2 * Math.tan(camera.fov * Math.PI / 360)) * 1.14 : 3
    const position = new Vector3(...portrait.position).addScaledVector(normal, distance)
    const rotation = (new Quaternion).setFromRotationMatrix((new Matrix4).lookAt(position, new Vector3(...portrait.position), up))
    galleryEvents.dispatchEvent(new CustomEvent('teleport', {
      detail: {
        position: position.toArray(),
        rotation: rotation.toArray(),
      },
    }))
    notify('You’re in front of the artwork. Step inside to keep exploring.')
  }
  return {
    begin,
    cancel,
    stop,
    teleportTo,
  }
}

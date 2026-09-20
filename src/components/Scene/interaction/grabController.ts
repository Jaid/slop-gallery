import type {Placement} from '#src/lib/gallery.ts'
import type {MutableRef} from './types.ts'
import type {RootState} from '@react-three/fiber/webgpu'

import {Vector3} from 'three/webgpu'

import {levelWallDistance} from '#level/navigation.ts'
import {cameraPose, chime, findPlacement, notify, useGallery} from '#src/lib/gallery.ts'

import {propObjects} from '../GrabbableProp.tsx'

const grab = () => {
  const state = useGallery.getState()
  if (state.held || !state.active || cameraPose.focused) {
    return
  }
  const portrait = state.portraits.find(candidate => candidate.id === state.active)
  if (portrait?.merging || portrait?.reserved) {
    return
  }
  useGallery.setState({held: state.active})
  const prop = propObjects.get(state.active)
  if (prop && !prop.grab()) {
    useGallery.setState({held: null})
    return
  }
  chime(440)
}

export default function createGrabController(camera: RootState['camera'], placement: MutableRef<Placement | null>) {
  const cancel = () => {
    const state = useGallery.getState()
    if (state.held) {
      propObjects.get(state.held)?.cancel()
    }
    useGallery.setState({
      held: null,
      placement: null,
    })
    placement.current = null
  }
  const release = (throwing = false) => {
    const state = useGallery.getState()
    const id = state.held
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
      chime(throwing ? 130 : 400)
      return
    }
    const portrait = state.portraits.find(candidate => candidate.id === id)
    if (!portrait) {
      return
    }
    if (throwing) {
      const direction = camera.getWorldDirection(new Vector3)
      const origin = camera.position.toArray()
      const distance = Math.min(1.45, Math.max(0.35, levelWallDistance(origin, direction.toArray()) - 0.4))
      const position = camera.position.clone().addScaledVector(direction, distance)
      state.commit(state.portraits.map(candidate => {
        return candidate.id === id ? {
          ...candidate,
          hung: false,
          wallId: undefined,
          orientation: undefined,
          position: position.toArray(),
          rotation: Math.atan2(-direction.x, -direction.z),
          velocity: direction.multiplyScalar(14).add(new Vector3(0, 1.5, 0)).toArray(),
        } : candidate
      }))
      chime(130)
    } else {
      const candidate = findPlacement(camera.position.toArray(), camera.getWorldDirection(new Vector3).toArray(), portrait.width, portrait.height, state.portraits, portrait.id)
      if (candidate?.valid) {
        state.commit(state.portraits.map(item => {
          return item.id === id ? {
            ...item,
            position: candidate.position,
            rotation: candidate.rotation,
            wallId: candidate.wallId,
            hung: true,
            orientation: undefined,
            velocity: undefined,
          } : item
        }))
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
  }
  return {
    cancel,
    grab,
    release,
  }
}

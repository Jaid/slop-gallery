import type {InteractionFrameRefs} from './types.ts'
import type {RootState} from '@react-three/fiber/webgpu'

import {useFrame} from '@react-three/fiber/webgpu'
import {Matrix4, PerspectiveCamera, Quaternion, Vector3} from 'three/webgpu'

import {levelWallDistance} from '#level/navigation.ts'
import {cameraPose, dragPose, findPlacement, narrate, roomAt, setCameraFocused, useGallery} from '#src/lib/gallery.ts'
import {interactiveObjects} from '#src/lib/gallery/interactiveObjects.ts'
import {isPortraitLabelHit} from '#src/lib/gallery/portraitLabel.ts'
import portraitObjects from '#src/lib/gallery/portraitObjects.ts'
import {isGallery} from '#src/lib/level.ts'

import {propObjects} from '../GrabbableProp.tsx'

const up = new Vector3(0, 1, 0)

export default function useInteractionFrame(camera: RootState['camera'], renderer: RootState['renderer'], {
  cursor,
  direction,
  firstPose,
  ghost,
  introduced,
  placement,
  previousHeld,
  ray,
  view,
}: InteractionFrameRefs) {
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.06)
    const s = useGallery.getState()
    if (isGallery && s.locked && !introduced.current && firstPose.current && (camera.position.distanceTo(firstPose.current.position) > 0.12 || camera.quaternion.angleTo(firstPose.current.rotation) > 0.1)) {
      introduced.current = true
      narrate('__intro')
    }
    if (previousHeld.current !== s.held) {
      placement.current = null
      previousHeld.current = s.held
    }
    const viewing = view.current
    if (viewing) {
      const portrait = s.portraits.find(candidate => candidate.id === viewing.id)
      if (!portrait?.hung && !viewing.returning) {
        viewing.returning = true
        useGallery.setState({inspecting: null})
      }
      let target = viewing.position
      let rotation = viewing.rotation
      if (!viewing.returning && portrait) {
        const normal = new Vector3(Math.sin(portrait.rotation), 0, Math.cos(portrait.rotation))
        const distance = camera instanceof PerspectiveCamera ? Math.max(portrait.height + 0.4, portrait.width / camera.aspect) / (2 * Math.tan(camera.fov * Math.PI / 360)) * 1.14 : 3
        target = new Vector3(...portrait.position).addScaledVector(normal, distance)
        rotation = (new Quaternion).setFromRotationMatrix((new Matrix4).lookAt(target, new Vector3(...portrait.position), up))
      }
      camera.position.lerp(target, 1 - Math.exp(-dt * 8))
      camera.quaternion.copy(viewing.look.update(rotation, dt))
      if (viewing.returning && camera.position.distanceTo(target) < 0.01 && camera.quaternion.angleTo(rotation) < 0.005) {
        viewing.restoreControls()
        view.current = null
        setCameraFocused(false)
      }
    }
    camera.getWorldDirection(direction.current)
    cameraPose.position = camera.position.toArray()
    cameraPose.direction = direction.current.toArray()
    const room = isGallery ? roomAt(cameraPose.position) : 'lobby'
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
      let closest = levelWallDistance(cameraPose.position, cameraPose.direction)
      let active: string | null = null
      let activeLabel: string | null = null
      for (const [id, object] of [...portraitObjects, ...propObjects, ...interactiveObjects]) {
        if (id === s.held || !object.group.visible) {
          continue
        }
        const portrait = s.portraits.find(candidate => candidate.id === id)
        if (portrait?.reserved) {
          continue
        }
        const hits = ray.current.intersectObject(object.group, true)
        if (!(hits[0] && hits[0].distance < closest)) {
          continue
        }
        closest = hits[0].distance
        active = id
        activeLabel = s.locked && !s.panel && portrait?.hung && isPortraitLabelHit(hits[0].object, object.group) ? id : null
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
    if (!isGallery || !ghost.current) {
      return
    }
    const portrait = s.portraits.find(candidate => candidate.id === s.held)
    if (!portrait && !dragPose.active) {
      ghost.current.visible = false
      placement.current = null
      return
    }
    const candidate = findPlacement(ray.current.ray.origin.toArray(), ray.current.ray.direction.toArray(), portrait?.width ?? 2.4, portrait?.height ?? 2.4, s.portraits, portrait?.id)
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
}

import type {Placement, Vec3} from '#src/lib/gallery.ts'
import type {MutableRef} from './types.ts'
import type {RootState} from '@react-three/fiber'

import {useEffect} from 'react'
import {Euler, PerspectiveCamera, Vector3} from 'three/webgpu'

import {effectiveSeed} from '#src/lib/environmentSeed.ts'
import {galleryEvents, setCameraFocused, useGallery} from '#src/lib/gallery.ts'
import portraitObjects from '#src/lib/gallery/portraitObjects.ts'
import pauseMenu from '#src/lib/pauseMenu.ts'
import {pendingLoads} from '#src/lib/pendingLoads.ts'
import {GalleryRenderer} from '#src/lib/rendering/GalleryRenderer.ts'
import {pendingImages} from '#src/lib/useArtworkTexture.ts'

import {propObjects} from '../GrabbableProp.tsx'

export default function useInteractionDiagnostics(camera: RootState['camera'], renderer: RootState['renderer'], placement: MutableRef<Placement | null>) {
  useEffect(() => {
    globalThis.slopGallery ??= {}
    const api = globalThis.slopGallery
    api.snapshot = () => ({
      webGPU: 'isWebGPUBackend' in renderer.backend && renderer.backend.isWebGPUBackend === true,
      camera: camera.position.toArray(),
      rotation: camera.rotation.toArray(),
      ready: useGallery.getState().ready,
      pendingImages: pendingImages(),
      pendingLoads: pendingLoads(),
      pendingPipelines: renderer instanceof GalleryRenderer ? renderer.pendingPipelines : 0,
      registered: portraitObjects.size,
      room: useGallery.getState().room,
      placement: placement.current,
      locked: useGallery.getState().locked,
      menuStage: pauseMenu.getSnapshot().stage,
      hasControlled: useGallery.getState().hasControlled,
      held: useGallery.getState().held,
      active: useGallery.getState().active,
      activeLabel: useGallery.getState().activeLabel,
      saveStatus: useGallery.getState().saveStatus,
      seed: effectiveSeed(useGallery.getState().seed),
      props: [...propObjects].map(([id, {body, group}]) => ({
        id,
        position: body.translation(),
        bodyType: body.bodyType(),
        sleeping: body.isSleeping(),
        visualPosition: group.getWorldPosition(new Vector3).toArray(),
        collidersEnabled: Array.from({length: body.numColliders()}, (_, index) => body.collider(index).isEnabled()),
      })),
      portraits: useGallery.getState().portraits.map(portrait => ({
        id: portrait.id,
        title: portrait.title,
        hung: portrait.hung,
        position: portrait.position,
        wallId: portrait.wallId,
        width: portrait.width,
        height: portrait.height,
        pending: portrait.pending,
        merging: portrait.merging,
        reserved: portrait.reserved,
        physical: portraitObjects.get(portrait.id)?.body.translation(),
      })),
    })
    const pageQuery = new URLSearchParams(location.search)
    if (pageQuery.get('test') === 'true') {
      api.teleport = (position: Vec3, rotation: Array<number>) => galleryEvents.dispatchEvent(new CustomEvent('teleport', {
        detail: {
          position,
          rotation,
        },
      }))
      api.merge = (first: string, second: string) => galleryEvents.dispatchEvent(new CustomEvent('merge', {detail: [first, second]}))
      // Detaches the camera from the player until the next teleport, so a still photo can be framed exactly.
      api.pose = ({position, rotation, fov} = {}) => {
        setCameraFocused(true)
        if (position) {
          camera.position.set(...position)
        }
        if (rotation) {
          camera.quaternion.setFromEuler(new Euler(...rotation, 'YXZ'))
        }
        if (fov !== undefined && camera instanceof PerspectiveCamera) {
          camera.fov = fov
          camera.updateProjectionMatrix()
        }
        const euler = new Euler
        euler.setFromQuaternion(camera.quaternion, 'YXZ')
        return {
          position: camera.position.toArray(),
          rotation: [euler.x, euler.y, euler.z],
          fov: camera instanceof PerspectiveCamera ? camera.fov : null,
        }
      }
    }
    return () => {
      delete api.snapshot
      delete api.teleport
      delete api.merge
      delete api.pose
    }
  }, [camera, placement, renderer])
}

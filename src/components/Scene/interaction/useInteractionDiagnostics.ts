import type {Placement, Vec3} from '#src/lib/gallery.ts'
import type {MutableRef} from './types.ts'
import type {RootState} from '@react-three/fiber/webgpu'

import {useEffect} from 'react'
import {Vector3} from 'three/webgpu'

import {galleryEvents, useGallery} from '#src/lib/gallery.ts'
import portraitObjects from '#src/lib/gallery/portraitObjects.ts'
import pauseMenu from '#src/lib/pauseMenu.ts'

import {propObjects} from '../GrabbableProp.tsx'

export default function useInteractionDiagnostics(camera: RootState['camera'], renderer: RootState['renderer'], placement: MutableRef<Placement | null>) {
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
      menuStage: pauseMenu.getSnapshot().stage,
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
  }, [camera, placement, renderer])
}

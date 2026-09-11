import {useFrame, useThree} from '@react-three/fiber/webgpu'
import {useEffect, useRef} from 'react'
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js'
import {PerspectiveCamera, Vector3} from 'three/webgpu'

import {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import {playAnnouncement} from '#src/lib/audio/playAnnouncement.ts'
import {OrbitInspection} from '#src/lib/camera/OrbitInspection.ts'
import {cameraPose, galleryEvents, isTextInput, markControlled, notify, stopNarration, useGallery} from '#src/lib/gallery.ts'
import {createKnotGeometry} from '#src/lib/gallery/sculptures.ts'
import {knotAnnouncementUrl} from '#src/lib/knots/announcementAssets.ts'
import {knotExhibition} from '#src/lib/knots/exhibition.ts'
import {KnotAnnouncer} from '#src/lib/knots/KnotAnnouncer.ts'

const exhibits = new Map(knotExhibition.map(item => [`prop-knot-${item.id}`, item]))
const announcedCreators = new Set<string>
const announcedItems = new Set<string>
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
  const session = useRef<Session | null>(null)
  const center = useRef(new Vector3)
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || !(controls instanceof PointerLockControls)) {
      return
    }
    let narrationVersion = 0
    let narrationId: string | undefined
    const announcer = new KnotAnnouncer({
      resolve: knotAnnouncementUrl,
      play: async (url, signal, title) => {
        signal.throwIfAborted()
        const id = narrationId!
        useGallery.setState({
          narration: {
            id,
            title,
            status: 'preparing',
            source: null,
          },
        })
        await playAnnouncement(url, signal, () => {
          useGallery.setState({
            narration: {
              id,
              title,
              status: 'playing',
              source: 'audio',
            },
          })
        })
      },
    }, announcedCreators, announcedItems)
    const stopAnnouncement = () => {
      narrationVersion++
      announcer.stop()
      if (narrationId && useGallery.getState().narration?.id === narrationId) {
        useGallery.setState({narration: null})
      }
      narrationId = undefined
    }
    const announce = (id: string) => {
      const item = exhibits.get(id)
      if (!item || !useGallery.getState().sound || announcer.hasAnnounced(item)) {
        return
      }
      stopNarration()
      const version = ++narrationVersion
      narrationId = id
      void announcer.announce(item).catch(error => {
        if (version === narrationVersion) {
          notify(error instanceof Error ? error.message : 'The announcement could not be played.')
        }
      }).finally(() => {
        if (version === narrationVersion) {
          if (useGallery.getState().narration?.id === id) {
            useGallery.setState({narration: null})
          }
          narrationId = undefined
        }
      })
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
      session.current = null
      cameraPose.focused = false
      useGallery.setState({inspecting: null})
    }
    const release = () => {
      session.current?.orbit.release()
      if (session.current && useGallery.getState().inspecting !== null) {
        useGallery.setState({inspecting: null})
      }
    }
    const down = (event: KeyboardEvent) => {
      if (event.code !== 'KeyV' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isTextInput(event.target)) {
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
      controls.enabled = false
      session.current = {
        id: state.active,
        orbit: new OrbitInspection(camera, object.group.getWorldPosition(center.current), baseRadius + (item.displacement ?? 0)),
        restoreControls: () => {
          controls.enabled = enabled
        },
      }
      cameraPose.focused = true
      useGallery.setState({inspecting: state.active})
      announce(state.active)
    }
    const up = (event: KeyboardEvent) => {
      if (event.code === 'KeyV') {
        release()
      }
    }
    const move = (event: MouseEvent) => {
      if (!controls.isLocked || document.pointerLockElement !== renderer.domElement) {
        return
      }
      session.current?.orbit.addInput(event.movementX * 0.0015 * controls.pointerSpeed, -event.movementY * 0.0015 * controls.pointerSpeed)
    }
    const teleport = () => {
      finish(false)
      stopAnnouncement()
    }
    const narrate = (event: Event) => announce((event as CustomEvent<string>).detail)
    const unsubscribe = useGallery.subscribe((state, previous) => {
      if (state.panel || !state.locked) {
        release()
      }
      if (!state.sound && previous.sound) {
        stopAnnouncement()
      }
    })
    globalThis.addEventListener('keydown', down)
    globalThis.addEventListener('keyup', up)
    window.addEventListener('blur', release)
    document.addEventListener('mousemove', move)
    galleryEvents.addEventListener('cancel-view', release)
    galleryEvents.addEventListener('teleport', teleport)
    galleryEvents.addEventListener('stop-narration', stopAnnouncement)
    galleryEvents.addEventListener('narrate', narrate)
    return () => {
      unsubscribe()
      globalThis.removeEventListener('keydown', down)
      globalThis.removeEventListener('keyup', up)
      window.removeEventListener('blur', release)
      document.removeEventListener('mousemove', move)
      galleryEvents.removeEventListener('cancel-view', release)
      galleryEvents.removeEventListener('teleport', teleport)
      galleryEvents.removeEventListener('stop-narration', stopAnnouncement)
      galleryEvents.removeEventListener('narrate', narrate)
      finish(true)
      stopAnnouncement()
    }
  }, [camera, controls, renderer])
  useFrame((_, delta) => {
    const current = session.current
    if (!current) {
      return
    }
    const object = propObjects.get(current.id)
    if (object?.group.visible) {
      object.group.getWorldPosition(center.current)
    } else {
      current.orbit.release()
    }
    if (current.orbit.update(center.current, delta)) {
      current.restoreControls()
      session.current = null
      cameraPose.focused = false
      useGallery.setState({inspecting: null})
    }
  })
  return null
}

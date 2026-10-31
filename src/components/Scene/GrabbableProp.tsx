import type {OrbitSettings} from '#src/lib/camera/OrbitInspection.ts'
import type {Vec3} from '#src/lib/gallery.ts'
import type {GrabbableBodyOptions} from '#src/lib/physics/GrabbableBody.ts'
import type {CollisionEnterPayload, RapierRigidBody, RigidBodyProps} from '@react-three/rapier'
import type {ReactNode} from 'react'
import type {Group, Object3D} from 'three/webgpu'

import {useFrame} from '@react-three/fiber'
import {RigidBody, useRapier} from '@react-three/rapier'
import {useEffect, useLayoutEffect, useRef} from 'react'

import {cameraPose, notify, requestItemMerge, useGallery} from '#src/lib/gallery.ts'
import {registerOrbitable} from '#src/lib/gallery/orbitables.ts'
import GrabbableBody from '#src/lib/physics/GrabbableBody.ts'
import {bodyThrow, clearBodyThrow} from '#src/lib/physics/ThrowState.ts'
import {snapshotObject} from '#src/lib/rendering/StudioSnapshotRenderer.ts'

export type PropHandle = {
  body: RapierRigidBody
  cancel: () => void
  /** whether a grab would currently succeed, without attempting it */
  canGrab: () => boolean
  grab: () => boolean
  group: Group
  move: (origin: Vec3, position: Vec3, delta: number) => void
  release: (throwing: boolean) => void
  /** Photographs the prop as it is now in the studio, as a WebP for a merge. */
  snapshot: () => Promise<Blob>
  title: string
}
export const propObjects = new Map<string, PropHandle>
/** a stand-in to photograph instead of the prop’s own children, built in the prop’s own frame, and how to release what was made for it */
export type SnapshotSubject = {
  dispose: () => void
  object: Object3D
}
type GrabbablePropProps = Omit<RigidBodyProps, 'children' | 'position' | 'ref'> & GrabbableBodyOptions & {
  blockedMessage?: () => string
  children: ReactNode
  id: string
  /** lets holding V orbit around the prop */
  orbit?: OrbitSettings
  position: Vec3
  /** For props drawn elsewhere, e.g. by an instanced batch, whose children are only invisible stand-ins: builds what the studio photographs when the prop is thrown into a work. */
  snapshotSubject?: () => SnapshotSubject
  title: string
}

export default function GrabbableProp({id, title, orbit, children, canGrab, blockedMessage, onAttachmentChange, recoverAsDynamic, attachmentBody, snapshotSubject, ...props}: GrabbablePropProps) {
  const body = useRef<RapierRigidBody>(null)
  const group = useRef<Group>(null)
  const controller = useRef<GrabbableBody | null>(null)
  const callbacks = useRef({
    canGrab,
    blockedMessage,
    onAttachmentChange,
    recoverAsDynamic,
    attachmentBody,
    snapshotSubject,
  })
  // Only effects, frame callbacks and input handlers read these, so committing them before paint is early enough.
  useLayoutEffect(() => {
    callbacks.current = {
      canGrab,
      blockedMessage,
      onAttachmentChange,
      recoverAsDynamic,
      attachmentBody,
      snapshotSubject,
    }
  }, [canGrab, blockedMessage, onAttachmentChange, recoverAsDynamic, attachmentBody, snapshotSubject])
  // Settings are read once per registration, so inline objects don’t re-register every render.
  const orbitSettings = useRef(orbit)
  const {world} = useRapier()
  const held = useGallery(s => s.held === id)
  useEffect(() => {
    if (!body.current || !group.current) {
      return
    }
    const carried = new GrabbableBody(body.current, world, {
      attachmentBody: () => callbacks.current.attachmentBody?.(),
      canGrab: () => callbacks.current.canGrab?.() ?? true,
      onAttachmentChange: attached => callbacks.current.onAttachmentChange?.(attached),
      recoverAsDynamic: () => callbacks.current.recoverAsDynamic?.() ?? false,
    })
    controller.current = carried
    const prop = group.current
    const handle: PropHandle = {
      body: body.current,
      group: prop,
      title,
      snapshot: async () => {
        const subject = callbacks.current.snapshotSubject?.()
        if (!subject) {
          const {image} = await snapshotObject(prop)
          return image
        }
        try {
          const {image} = await snapshotObject(subject.object)
          return image
        } finally {
          subject.dispose()
        }
      },
      canGrab: () => !carried.active && (callbacks.current.canGrab?.() ?? true),
      grab: () => {
        if (!carried.grab()) {
          const message = callbacks.current.blockedMessage?.()
          if (message) {
            notify(message)
          }
          return false
        }
        return true
      },
      cancel: () => carried.cancel(),
      move: (origin, target, delta) => carried.move(origin, target, delta),
      release: throwing => {
        if (carried.release(throwing, cameraPose.direction)) {
          notify('Not enough room here. Returned the object.')
        }
      },
    }
    propObjects.set(id, handle)
    const unregisterOrbitable = orbitSettings.current && registerOrbitable(id, {
      body: body.current,
      group: group.current,
      orbit: orbitSettings.current,
      title,
    })
    return () => {
      unregisterOrbitable?.()
      if (propObjects.get(id) === handle) {
        propObjects.delete(id)
      }
      if (controller.current === carried) {
        controller.current = null
      }
    }
  }, [id, title, world])
  useEffect(() => {
    if (!held) {
      controller.current?.cancel()
    }
  }, [held])
  useFrame((_, delta) => {
    const carried = controller.current
    if (!carried) {
      return
    }
    carried.recover()
    if (!held) {
      return
    }
    const p = cameraPose.position
    const d = cameraPose.direction
    const origin: Vec3 = [p[0], p[1] - 0.22, p[2]]
    carried.move(origin, [origin[0] + d[0] * 1.45, origin[1] + d[1] * 1.45, origin[2] + d[2] * 1.45], delta)
  })
  const struck = (event: CollisionEnterPayload) => {
    const current = body.current
    // Only a throw merges, not a drop or a knock; one throw merges once, even if the prop bounces into another work.
    if (!current || !group.current || !bodyThrow(current)) {
      return
    }
    const other: unknown = event.other.rigidBodyObject?.userData.portraitId
    const target = useGallery.getState().portraits.find(portrait => portrait.id === other)
    if (!target?.hung || target.merging || target.reserved) {
      return
    }
    const handle = propObjects.get(id)
    if (!handle) {
      return
    }
    clearBodyThrow(current)
    requestItemMerge(target.id, {
      id,
      title,
      snapshot: handle.snapshot,
    })
  }
  return <RigidBody ccd colliders='cuboid' friction={0.8} mass={1.8} restitution={0.32} ref={body} onCollisionEnter={struck} {...props}>
    <group
      name={id} userData={{
        pickup: true,
        propId: id,
        title,
      }} ref={group}
    >{children}</group>
  </RigidBody>
}

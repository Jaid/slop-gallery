import type {ReactNode} from 'react'
import type {RapierRigidBody, RigidBodyProps} from '@react-three/rapier'
import type {Group} from 'three/webgpu'
import type {Vec3} from '#src/lib/gallery.ts'

import {useFrame} from '@react-three/fiber/webgpu'
import {RigidBody, useRapier} from '@react-three/rapier'
import {useEffect, useRef} from 'react'

import {cameraPose, notify, useGallery} from '#src/lib/gallery.ts'
import {GrabbableBody, type GrabbableBodyOptions} from '#src/lib/physics/GrabbableBody.ts'

export type PropHandle = {
  body: RapierRigidBody
  cancel: () => void
  grab: () => boolean
  group: Group
  move: (origin: Vec3, position: Vec3, delta: number) => void
  release: (throwing: boolean) => void
  title: string
}
export const propObjects = new Map<string, PropHandle>

type GrabbablePropProps = Omit<RigidBodyProps, 'children' | 'ref' | 'position'> & GrabbableBodyOptions & {
  children: ReactNode
  id: string
  title: string
  position: Vec3
  blockedMessage?: () => string
}

export default function GrabbableProp({id, title, children, canGrab, blockedMessage, onAttachmentChange, recoverAsDynamic, ...props}: GrabbablePropProps) {
  const body = useRef<RapierRigidBody>(null)
  const group = useRef<Group>(null)
  const controller = useRef<GrabbableBody | null>(null)
  const callbacks = useRef({canGrab, blockedMessage, onAttachmentChange, recoverAsDynamic})
  callbacks.current = {canGrab, blockedMessage, onAttachmentChange, recoverAsDynamic}
  const {world} = useRapier()
  const held = useGallery(s => s.held === id)
  useEffect(() => {
    if (!body.current || !group.current) return
    const carried = new GrabbableBody(body.current, world, {
      canGrab: () => callbacks.current.canGrab?.() ?? true,
      onAttachmentChange: attached => callbacks.current.onAttachmentChange?.(attached),
      recoverAsDynamic: () => callbacks.current.recoverAsDynamic?.() ?? false,
    })
    controller.current = carried
    const handle: PropHandle = {
      body: body.current,
      group: group.current,
      title,
      grab: () => {
        if (!carried.grab()) {
          const message = callbacks.current.blockedMessage?.()
          if (message) notify(message)
          return false
        }
        return true
      },
      cancel: () => carried.cancel(),
      move: (origin, target, delta) => carried.move(origin, target, delta, useGallery.getState().motion),
      release: throwing => {
        if (carried.release(throwing, cameraPose.direction)) notify('Not enough room here. Returned the object to its last clear spot.')
      },
    }
    propObjects.set(id, handle)
    return () => {
      if (propObjects.get(id) === handle) propObjects.delete(id)
      if (controller.current === carried) controller.current = null
    }
  }, [id, title, world])
  useEffect(() => {
    if (!held) controller.current?.cancel()
  }, [held])
  useFrame((_, delta) => {
    const carried = controller.current
    if (!carried) return
    carried.recover()
    if (!held) return
    const p = cameraPose.position
    const d = cameraPose.direction
    const origin: Vec3 = [p[0], p[1] - 0.22, p[2]]
    carried.move(origin, [origin[0] + d[0] * 1.45, origin[1] + d[1] * 1.45, origin[2] + d[2] * 1.45], delta, useGallery.getState().motion)
  })
  return <RigidBody ref={body} colliders="cuboid" ccd restitution={0.32} friction={0.8} mass={1.8} {...props}>
    <group ref={group}>{children}</group>
  </RigidBody>
}

import type {OrbitSettings} from '#src/lib/camera/OrbitInspection.ts'
import type {ThrownOrb, Vec3} from '#src/lib/gallery.ts'
import type {Mood} from '#src/lib/moods/index.ts'
import type {GrabbableBodyOptions} from '#src/lib/physics/GrabbableBody.ts'
import type {CollisionEnterPayload, RapierRigidBody, RigidBodyProps} from '@react-three/rapier'
import type {ReactNode} from 'react'
import type {Group, Object3D} from 'three/webgpu'

import {useFrame} from '@react-three/fiber'
import {RigidBody, useRapier} from '@react-three/rapier'
import {useEffect, useLayoutEffect, useRef} from 'react'
import {Box3, Vector3} from 'three/webgpu'

import {cameraPose, notify, requestItemMerge, useGallery} from '#src/lib/gallery.ts'
import {handBack, settle} from '#src/lib/gallery/fusion/handBack.ts'
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
  /** the mood that comes over the world while the player holds the prop */
  mood?: Mood
  release: (throwing: boolean) => void
  /** Takes the prop out of the physics for a fusion, which flies it around by its `group` until it calls `unleash`; false while the player carries it. */
  seize: () => boolean
  /** whether a fusion holds the prop */
  seized: () => boolean
  /** Photographs the prop as it is now in the studio, as a WebP for a merge. */
  snapshot: () => Promise<Blob>
  title: string
  /** Hands the prop back to the physics where its `group` is, flying off with the velocities. */
  unleash: (velocity: Vec3, spin: Vec3) => void
}
export const propObjects = new Map<string, PropHandle>
/** how far below the middle of the view a carried prop floats, in radians: low and in the middle, as if held in front of the chest */
const holdTilt = 15 * Math.PI / 180
/** how far from the eye a carried prop’s surface stays, roughly, in meters, before its size adds to it: very near, without reaching the near plane */
const holdGap = 0.35
/** how much a carried prop’s size, half its longest side, adds to its distance, so a large one stays in view instead of filling it; an orb floats 0.55 m away */
const holdSpread = 1.4
/** how far below the eye the line a carried prop is let go along starts, in meters, safely inside the player’s capsule */
const holdDrop = 0.22
const worldUp: Vec3 = [0, 1, 0]
type HoldLine = {
  /** where the view looks, which a throw follows */
  direction: Vec3
  /** inside the player’s capsule, where letting go starts looking for room */
  origin: Vec3
  /** where the prop floats */
  target: Vec3
}
/** Where a prop held `distance` away floats, for an eye at `position` looking along `direction` with `up` as the view’s up: down the view’s middle, tilted by {@link holdTilt}. */
const holdLine = (position: Vec3, direction: Vec3, distance: number, up: Vec3 = worldUp): HoldLine => {
  // The view’s up, square to where it looks, also when only the world’s up is known.
  const along = up[0] * direction[0] + up[1] * direction[1] + up[2] * direction[2]
  const square = up.map((value, axis) => value - direction[axis] * along)
  const length = Math.hypot(...square) || 1
  const tilt = direction.map((value, axis) => value * Math.cos(holdTilt) - square[axis] / length * Math.sin(holdTilt))
  return {
    direction,
    origin: [position[0], position[1] - holdDrop, position[2]],
    target: position.map((value, axis) => value + tilt[axis] * distance) as Vec3,
  }
}
const eye = new Vector3
const look = new Vector3
const viewUp = new Vector3
const holding = new Vector3
const bounds = new Box3
const size = new Vector3
/** a stand-in to photograph instead of the prop’s own children, built in the prop’s own frame, and how to release what was made for it */
export type SnapshotSubject = {
  dispose: () => void
  object: Object3D
}
type GrabbablePropProps = Omit<RigidBodyProps, 'children' | 'position' | 'ref'> & GrabbableBodyOptions & {
  blockedMessage?: () => string
  children: ReactNode
  id: string
  /** what comes over the world while the player holds the prop */
  mood?: Mood
  /** For orbs: what a work struck by the prop is reworked by, instead of merging it with a studio photograph of the prop. */
  orb?: Pick<ThrownOrb, 'color' | 'photo' | 'prompt'>
  /** lets holding V orbit around the prop */
  orbit?: OrbitSettings
  position: Vec3
  /** For props drawn elsewhere, e.g. by an instanced batch, whose children are only invisible stand-ins: builds what the studio photographs when the prop is thrown into a work. */
  snapshotSubject?: () => SnapshotSubject
  title: string
}

/**
 * A prop the player can pick up, carry, drop and throw. Carried, it is out of the physics altogether: its body stays disabled where it was picked up, and its inner group floats in front of the camera, so nothing bumps into it on the way. Letting go puts the body where it fits along the line from the player to the prop.
 */
export default function GrabbableProp({id, title, mood, orb, orbit, children, canGrab, blockedMessage, onAttachmentChange, recoverAsDynamic, snapshotSubject, ...props}: GrabbablePropProps) {
  const body = useRef<RapierRigidBody>(null)
  const group = useRef<Group>(null)
  const controller = useRef<GrabbableBody | null>(null)
  /** the line the carried prop was last shown on, which letting go of it continues from */
  const shownOn = useRef<HoldLine | null>(null)
  /** how far from the eye the prop floats while carried, by its size when it was picked up */
  const holdDistance = useRef(0)
  const callbacks = useRef({
    canGrab,
    blockedMessage,
    onAttachmentChange,
    recoverAsDynamic,
    snapshotSubject,
  })
  // Only effects, frame callbacks and input handlers read these, so committing them before paint is early enough.
  useLayoutEffect(() => {
    callbacks.current = {
      canGrab,
      blockedMessage,
      onAttachmentChange,
      recoverAsDynamic,
      snapshotSubject,
    }
  }, [canGrab, blockedMessage, onAttachmentChange, recoverAsDynamic, snapshotSubject])
  // Settings are read once per registration, so inline objects don’t re-register every render.
  const orbitSettings = useRef(orbit)
  const {world} = useRapier()
  const held = useGallery(s => s.held === id)
  useEffect(() => {
    if (!body.current || !group.current) {
      return
    }
    const carried = new GrabbableBody(body.current, world, {
      canGrab: () => callbacks.current.canGrab?.() ?? true,
      onAttachmentChange: attached => callbacks.current.onAttachmentChange?.(attached),
      recoverAsDynamic: () => callbacks.current.recoverAsDynamic?.() ?? false,
    })
    controller.current = carried
    const prop = group.current
    const rigidBody = body.current
    let seized = false
    const handle: PropHandle = {
      body: rigidBody,
      group: prop,
      mood,
      title,
      seize: () => {
        if (seized || carried.active) {
          return false
        }
        seized = true
        clearBodyThrow(rigidBody)
        rigidBody.setEnabled(false)
        return true
      },
      seized: () => seized,
      unleash: (velocity, spin) => {
        if (!seized) {
          return
        }
        seized = false
        handBack(rigidBody, prop, velocity, spin)
      },
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
      canGrab: () => !seized && !carried.active && (callbacks.current.canGrab?.() ?? true),
      grab: () => {
        if (seized || !carried.grab()) {
          const message = callbacks.current.blockedMessage?.()
          if (message) {
            notify(message)
          }
          return false
        }
        bounds.setFromObject(prop).getSize(size)
        holdDistance.current = holdGap + holdSpread * Math.max(size.x, size.y, size.z) / 2
        return true
      },
      cancel: () => {
        shownOn.current = null
        if (carried.active) {
          carried.cancel()
          settle(rigidBody, prop)
        }
      },
      release: throwing => {
        // Let go of where it was shown, or before it was ever shown, where the camera holds it.
        const {direction, origin, target} = shownOn.current ?? holdLine(cameraPose.position, cameraPose.direction, holdDistance.current)
        shownOn.current = null
        const returned = carried.release(origin, target, throwing, direction)
        settle(rigidBody, prop)
        if (returned) {
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
  }, [id, mood, title, world])
  useEffect(() => {
    if (!held) {
      propObjects.get(id)?.cancel()
    }
  }, [held, id])
  useFrame(() => {
    controller.current?.recover()
  })
  // Placed right before the frame is drawn, once the camera has moved for it, so the prop never trails it by a frame: very near, low in the middle of the view. It keeps the turn it had when picked up, which is its body’s and so its holder’s.
  useFrame(({camera}) => {
    const prop = group.current
    const holder = prop?.parent
    if (!controller.current?.active || !holder) {
      return
    }
    camera.getWorldPosition(eye)
    camera.getWorldDirection(look)
    viewUp.setFromMatrixColumn(camera.matrixWorld, 1)
    const line = holdLine(eye.toArray(), look.toArray(), holdDistance.current, viewUp.toArray())
    shownOn.current = line
    holder.updateWorldMatrix(true, false)
    prop.position.copy(holder.worldToLocal(holding.fromArray(line.target)))
  }, {before: 'render'})
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
      ...orb,
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

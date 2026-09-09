import type {EgoOptions} from './options.ts'
import type {EgoInputReader, EgoPlayerHandle, EgoPosition, EgoState, EgoToggle} from './types.ts'
import type {RapierCollider, RapierRigidBody, RigidBodyProps} from '@react-three/rapier'
import type {ComponentProps, ReactNode, Ref} from 'react'

import {PointerLockControls} from '@react-three/drei/webgpu'
import {useFrame, useThree} from '@react-three/fiber/webgpu'
import {CapsuleCollider, RigidBody, useAfterPhysicsStep, useBeforePhysicsStep, useRapier} from '@react-three/rapier'
import {useEffect, useImperativeHandle, useRef, useState} from 'react'

import {EgoMotor} from './EgoMotor.ts'
import {EgoView} from './EgoView.ts'
import {getCapsuleHalfHeight} from './math.ts'
import {resolveEgoOptions} from './options.ts'

export type EgoPointerLockOptions = Omit<ComponentProps<typeof PointerLockControls>, 'camera' | 'domElement' | 'ref'>
export type EgoPlayerProps = EgoOptions & {
  /** Only the camera position writer; disable while another system owns the view. */
  cameraEnabled?: EgoToggle
  children?: ReactNode
  /** Enables input, not gravity. May read an external store without React subscriptions. */
  enabled?: EgoToggle
  input: EgoInputReader
  /** Called for active input during a physics step. */
  onInput?: (input: ReturnType<EgoInputReader>) => void
  /** Called once per stride, independently of audio and head-bob amplitude. */
  onStep?: (state: EgoState) => void
  /** Called after physics with a detached snapshot. */
  onUpdate?: (state: EgoState) => void
  /** false omits look controls; an object customizes Drei’s pointer-lock controls. */
  pointerLock?: EgoPointerLockOptions | boolean
  /** Initial world-space feet position. Use the ref to teleport after mounting. */
  position?: EgoPosition
  ref?: Ref<EgoPlayerHandle>
  /** Defaults to true. Only a lock on this Canvas enables input. */
  requirePointerLock?: boolean
  userData?: RigidBodyProps['userData']
  /** Initial camera yaw in radians; updates intentionally reset camera orientation. */
  yaw?: number
}

const initialPosition: EgoPosition = [0, 0.05, 0]
const readToggle = (value: EgoToggle) => {
  return typeof value === 'function' ? value() : value
}
export function EgoPlayer({cameraEnabled = true, children, enabled = true, input, onInput, onStep, onUpdate, pointerLock = true, position = initialPosition, ref, requirePointerLock = true, userData, yaw = 0, ...options}: EgoPlayerProps) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const colliderRef = useRef<RapierCollider>(null)
  const motorRef = useRef<EgoMotor | null>(null)
  const camera = useThree(state => state.camera)
  const renderer = useThree(state => state.renderer)
  const {rapier, world} = useRapier()
  const resolved = resolveEgoOptions(options)
  const [view] = useState(() => new EgoView(resolved.eyeHeight))
  // The motor owns subsequent collider resizing; React must not restore the standing shape.
  const [initial] = useState(() => {
    const radius = Math.max(resolved.radius, 0.01)
    const height = Math.max(resolved.height, radius * 2)
    return {
      position: [...position] as [number, number, number],
      radius,
      height,
    }
  })
  useEffect(() => {
    const body = bodyRef.current
    const collider = colliderRef.current
    if (!body || !collider) {
      return
    }
    const motor = new EgoMotor(rapier, world, body, collider)
    motorRef.current = motor
    return () => {
      motorRef.current = null
      motor.dispose()
    }
  }, [rapier, world])
  useEffect(() => {
    motorRef.current?.configure(options)
  })
  useEffect(() => {
    camera.rotation.set(0, yaw, 0, 'YXZ')
  }, [camera, yaw])
  useImperativeHandle(ref, () => ({
    get body() {
      return bodyRef.current
    },
    getState: () => motorRef.current?.getState() ?? null,
    teleport: (destination, rotation) => {
      const motor = motorRef.current
      if (!motor) {
        return
      }
      if (rotation && (!rotation.every(Number.isFinite) || Math.hypot(...rotation) === 0)) {
        throw new RangeError('ego-player: teleport rotation must be a finite, nonzero quaternion.')
      }
      motor.teleport(destination)
      const eyeHeight = motor.crouching ? resolved.crouchEyeHeight : resolved.eyeHeight
      view.reset(eyeHeight)
      camera.position.set(destination[0], destination[1] + eyeHeight, destination[2])
      if (rotation) {
        camera.quaternion.set(...rotation).normalize()
      }
    },
  }), [camera, resolved.crouchEyeHeight, resolved.eyeHeight, view])
  useBeforePhysicsStep(physicsWorld => {
    const motor = motorRef.current
    if (!motor) {
      return
    }
    const keys = input()
    const active = readToggle(enabled) && (!requirePointerLock || renderer.domElement.ownerDocument.pointerLockElement === renderer.domElement)
    if (active && onInput && (keys.forward || keys.backward || keys.left || keys.right || keys.jump || keys.crouch || keys.sprint)) {
      onInput(keys)
    }
    motor.step(physicsWorld.timestep, keys, camera.quaternion, active)
  })
  useAfterPhysicsStep(() => {
    if (onUpdate && motorRef.current) {
      onUpdate(motorRef.current.getState())
    }
  })
  useFrame((_, delta) => {
    const motor = motorRef.current
    if (!motor) {
      return
    }
    const {offset, stepped} = view.update(delta, motor.horizontalSpeed, motor.grounded, motor.crouching, resolved)
    if (stepped && onStep) {
      onStep(motor.getState())
    }
    if (readToggle(cameraEnabled)) {
      const translation = motor.body.translation()
      camera.position.set(translation.x, translation.y + offset, translation.z)
    }
  })
  return <>
    {pointerLock !== false && <PointerLockControls makeDefault {...typeof pointerLock === 'object' ? pointerLock : {}} domElement={renderer.domElement}/>}
    <RigidBody ref={bodyRef} type="kinematicPosition" userData={userData} colliders={false} canSleep={false} position={initial.position}>
      <CapsuleCollider ref={colliderRef} args={[getCapsuleHalfHeight(initial.height, initial.radius), initial.radius]} position={[0, initial.height / 2, 0]} friction={0} restitution={0}/>
      {children}
    </RigidBody>
  </>
}


import type {EgoDump} from './EgoDiagnostics.ts'
import type {EgoOptions} from './options.ts'
import type {EgoInputReader, EgoPlayerHandle, EgoPosition, EgoRotation, EgoState, EgoToggle} from './types.ts'
import type {RapierCollider, RapierRigidBody, RigidBodyProps} from '@react-three/rapier'
import type {ComponentProps, ReactNode, Ref} from 'react'

import {PointerLockControls} from '@react-three/drei/webgpu'
import {useFrame, useThree} from '@react-three/fiber/webgpu'
import {CapsuleCollider, RigidBody, useAfterPhysicsStep, useBeforePhysicsStep, useRapier} from '@react-three/rapier'
import Branch from 'branch-component'
import {useEffect, useImperativeHandle, useRef, useState} from 'react'

import EgoDiagnostics from './EgoDiagnostics.ts'
import EgoMotor from './EgoMotor.ts'
import EgoView from './EgoView.ts'
import EgoZoom from './EgoZoom.ts'
import {getCapsuleHalfHeight} from './math.ts'
import {resolveEgoOptions} from './options.ts'

export type EgoPointerLockOptions = Omit<ComponentProps<typeof PointerLockControls>, 'camera' | 'domElement' | 'ref'>
export type EgoPlayerProps = EgoOptions & {
  /** Only the camera position writer; disable while another system owns the view. */
  cameraEnabled?: EgoToggle
  children?: ReactNode
  /** Enables input, not gravity. May read an external store without React subscriptions. */
  enabled?: EgoToggle
  /** Safe feet position used when a spawn/teleport fits neither standing nor crouching. */
  fallbackPosition?: EgoPosition
  input: EgoInputReader
  /** Enables the dump action. Called once per press with a detached diagnostic snapshot. */
  onDump?: (dump: EgoDump) => void
  /** Called for active input during a physics step. */
  onInput?: (input: ReturnType<EgoInputReader>) => void
  /** Called once per interact press while input is active. */
  onInteract?: () => void
  /** Called once per stride, independently of audio and head-bob amplitude. */
  onStep?: (state: EgoState) => void
  /** Called after physics with a detached snapshot. */
  onUpdate?: (state: EgoState) => void
  /** Initial camera pitch in radians; updates intentionally reset camera orientation. */
  pitch?: number
  /** false omits look controls; an object customizes Drei’s pointer-lock controls. */
  pointerLock?: EgoPointerLockOptions | boolean
  /** Initial world-space feet position. Use the ref to teleport after mounting. */
  position?: EgoPosition
  ref?: Ref<EgoPlayerHandle>
  /** Defaults to true. Only a lock on this Canvas enables input. */
  requirePointerLock?: boolean
  /** Rigid-body metadata. Defaults to {isPlayer: true}; a supplied value replaces it. */
  userData?: RigidBodyProps['userData']
  /** Initial camera yaw in radians; updates intentionally reset camera orientation. */
  yaw?: number
  /** FOV divisor while zoom is held. Defaults to 2. */
  zoomFactor?: number
}

const initialPosition: EgoPosition = [0, 0.05, 0]
const readToggle = (value: EgoToggle) => {
  return typeof value === 'function' ? value() : value
}
export default function EgoPlayer({cameraEnabled = true, children, enabled = true, fallbackPosition, input, onDump, onInteract, zoomFactor = 2, onInput, onStep, onUpdate, pitch = 0, pointerLock = true, position = initialPosition, ref, requirePointerLock = true, userData, yaw = 0, ...options}: EgoPlayerProps) {
  const [defaultUserData] = useState(() => ({isPlayer: true}))
  if (!Number.isFinite(zoomFactor) || zoomFactor < 1) {
    throw new RangeError('ego-player: zoomFactor must be finite and at least 1.')
  }
  const actionKeys = useRef({
    interact: false,
    dump: false,
  })
  const [zoom] = useState(() => new EgoZoom)
  const bodyRef = useRef<RapierRigidBody>(null)
  const colliderRef = useRef<RapierCollider>(null)
  const motorRef = useRef<EgoMotor | null>(null)
  const initialized = useRef(false)
  const pendingTeleport = useRef<{position: EgoPosition
    rotation?: EgoRotation} | null>(null)
  const camera = useThree(state => state.camera)
  const scene = useThree(state => state.scene)
  const diagnostics = useRef<EgoDiagnostics | null>(null)
  useEffect(() => {
    diagnostics.current = onDump ? new EgoDiagnostics(scene, camera) : null
    return () => {
      diagnostics.current = null
    }
  }, [scene, camera, onDump])
  useEffect(() => () => zoom.reset(), [zoom, camera])
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
    initialized.current = false
    return () => {
      motorRef.current = null
      motor.dispose()
    }
  }, [rapier, world])
  useEffect(() => {
    motorRef.current?.configure(options)
  })
  useEffect(() => {
    camera.rotation.set(pitch, yaw, 0, 'YXZ')
  }, [camera, pitch, yaw])
  const applyTeleport = (destination: EgoPosition, rotation?: EgoRotation, writeCamera = true) => {
    zoom.reset()
    const motor = motorRef.current!
    motor.teleport(destination, fallbackPosition)
    const eyeHeight = motor.crouching ? resolved.crouchEyeHeight : resolved.eyeHeight
    view.reset(eyeHeight)
    const actual = motor.body.translation()
    if (writeCamera) {
      camera.position.set(actual.x, actual.y + eyeHeight, actual.z)
    }
    if (rotation) {
      camera.quaternion.set(...rotation).normalize()
    }
  }
  const initialize = () => {
    if (!motorRef.current || initialized.current) {
      return
    }
    // Sibling colliders finish mounting before physics/render callbacks, independent of JSX order.
    const pending = pendingTeleport.current
    const feet = motorRef.current.body.translation()
    applyTeleport(pending?.position ?? [feet.x, feet.y, feet.z], pending?.rotation, !!pending || readToggle(cameraEnabled))
    pendingTeleport.current = null
    initialized.current = true
  }
  useImperativeHandle(ref, () => ({
    releaseZoom: () => zoom.reset(),
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
      if (!destination.every(Number.isFinite)) {
        throw new RangeError('ego-player: teleport position must be finite.')
      }
      if (!initialized.current) {
        pendingTeleport.current = {
          position: [...destination],
          rotation: rotation && [...rotation],
        }
        return
      }
      applyTeleport(destination, rotation)
    },
  }))
  useBeforePhysicsStep(physicsWorld => {
    initialize()
    const motor = motorRef.current
    if (!motor) {
      return
    }
    const keys = input()
    const active = readToggle(enabled) && (!requirePointerLock || renderer.domElement.ownerDocument.pointerLockElement === renderer.domElement)
    if (active && onInput && (keys.forward || keys.backward || keys.left || keys.right || keys.jump || keys.crouch || keys.sprint || !keys.modifier && (keys.zoom || keys.interact && onInteract || keys.dump && onDump))) {
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
    initialize()
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
    const keys = input()
    const active = readToggle(enabled) && !keys.modifier && (!requirePointerLock || renderer.domElement.ownerDocument.pointerLockElement === renderer.domElement)
    zoom.update(camera, active && readToggle(cameraEnabled) && !!keys.zoom, zoomFactor)
    if (active && keys.interact && !actionKeys.current.interact) {
      onInteract?.()
    }
    if (active && keys.dump && !actionKeys.current.dump && onDump && diagnostics.current) {
      onDump(diagnostics.current.capture(motor.getState(), keys))
    }
    actionKeys.current = {
      interact: !!keys.interact,
      dump: !!keys.dump,
    }
  })
  return <>
    <Branch if={pointerLock !== false}><PointerLockControls makeDefault {...typeof pointerLock === 'object' ? pointerLock : {}} domElement={renderer.domElement}/></Branch>
    <RigidBody ref={bodyRef} type="kinematicPosition" userData={userData === undefined ? defaultUserData : userData} colliders={false} canSleep={false} position={initial.position}>
      <CapsuleCollider ref={colliderRef} args={[getCapsuleHalfHeight(initial.height, initial.radius), initial.radius]} position={[0, initial.height / 2, 0]} friction={0} restitution={0}/>
      {children}
    </RigidBody>
  </>
}

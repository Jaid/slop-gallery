import type {Actions} from '../App/controls'
import type {RapierCollider, RapierRigidBody} from '@react-three/rapier'

import {PointerLockControls, useKeyboardControls} from '@react-three/drei/webgpu'
import {useFrame, useThree} from '@react-three/fiber/webgpu'
import {CapsuleCollider, RigidBody, useBeforePhysicsStep, useRapier} from '@react-three/rapier'
import {useEffect, useRef, useState} from 'react'
import {Quaternion, Vector3} from 'three/webgpu'

import {SoundEngine} from '#src/lib/audio/SoundEngine.ts'
import {cameraPose, galleryEvents, markControlled, useGallery} from '#src/lib/gallery.ts'
import {playerTelemetry} from '#src/lib/telemetry/index.ts'

import {getCapsuleHalfHeight, getJumpVelocity} from './util'

export type RapierPlayerProps = {
  acceleration?: number
  airAcceleration?: number
  airDeceleration?: number
  cameraSharpness?: number
  characterMass?: number | null
  collisionGroups?: number
  contactOffset?: number
  coyoteTime?: number
  crouchEyeHeight?: number
  crouchFactor?: number
  crouchHeight?: number
  crouchJumpFactor?: number
  deceleration?: number
  enabled?: boolean
  eyeHeight?: number
  fallGravityFactor?: number
  gravity?: number
  headBob?: number
  headBobFrequency?: number
  height?: number
  jumpBufferTime?: number
  jumpHeight?: number
  jumpReleaseFactor?: number
  maxDelta?: number
  maxSlopeAngle?: number
  maxSpeedDown?: number
  position?: [number, number, number]
  pushDynamicBodies?: boolean
  radius?: number
  slideAngle?: number
  snapToGround?: number
  speed?: number
  sprintFactor?: number
  sprintJumpFactor?: number
  stepHeight?: number
  stepMinWidth?: number
  yaw?: number
}
const isCharacterObstacle = (collider: RapierCollider) => collider.isEnabled() && !collider.isSensor()
const up = new Vector3(0, 1, 0)
const forward = new Vector3
const right = new Vector3
const targetVelocity = new Vector3
const horizontalVelocity = new Vector3
const desiredMovement = {
  x: 0,
  y: 0,
  z: 0,
}
const identityRotation = {
  x: 0,
  y: 0,
  z: 0,
  w: 1,
}
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const approachHorizontal = (current: Vector3, target: Vector3, maxDelta: number) => {
  const dx = target.x - current.x
  const dz = target.z - current.z
  const distance = Math.hypot(dx, dz)
  if (distance <= maxDelta || distance === 0) {
    current.x = target.x
    current.z = target.z
    return
  }
  const factor = maxDelta / distance
  current.x += dx * factor
  current.z += dz * factor
}
const RapierPlayer = ({acceleration = 18,
  airAcceleration = 6,
  airDeceleration = 1.5,
  cameraSharpness = 18,
  characterMass = 80,
  collisionGroups,
  contactOffset = 0.02,
  coyoteTime = 0.12,
  crouchEyeHeight = 0.4,
  crouchFactor = 0.7,
  crouchHeight = 1,
  crouchJumpFactor = 0.4,
  deceleration = 22,
  enabled = true,
  eyeHeight = 0.8,
  fallGravityFactor = 1.35,
  gravity = 9.81,
  headBob = 0.018,
  headBobFrequency = 1.8,
  height = 1.6,
  jumpBufferTime = 0.14,
  jumpHeight = 1.5,
  jumpReleaseFactor = 0.55,
  maxDelta = 0.05,
  maxSlopeAngle = 50,
  maxSpeedDown = 30,
  position = [0, 1.2, 3.4],
  pushDynamicBodies = true,
  radius = 0.3,
  slideAngle = 55,
  snapToGround = 0.18,
  speed = 2.5,
  sprintFactor = 2.5,
  sprintJumpFactor = 1.3,
  stepHeight = 0.3,
  stepMinWidth = 0.2,
  yaw = 0}: RapierPlayerProps) => {
  const safeRadius = Math.max(radius, 0.01)
  const standingHeight = Math.max(height, safeRadius * 2)
  const crouchingHeight = clamp(crouchHeight, safeRadius * 2, standingHeight)
  const [crouching, setCrouching] = useState(false)
  const crouchingRef = useRef(false)
  const bodyRef = useRef<RapierRigidBody>(null)
  const colliderRef = useRef<RapierCollider>(null)
  const controllerRef = useRef<ReturnType<ReturnType<typeof useRapier>['world']['createCharacterController']> | null>(null)
  const groundedRef = useRef(false)
  const lastGroundedAtRef = useRef(Number.NEGATIVE_INFINITY)
  const jumpBufferedUntilRef = useRef(Number.NEGATIVE_INFINITY)
  const jumpHeldRef = useRef(false)
  const clockRef = useRef(0)
  const verticalVelocityRef = useRef(0)
  const velocityRef = useRef(new Vector3)
  const physicalVelocity = useRef(new Vector3)
  const cameraHeightRef = useRef(standingHeight / 2 + eyeHeight)
  const bobPhaseRef = useRef(0)
  const getKeys = useKeyboardControls<Actions>()[1]
  const camera = useThree(state => state.camera)
  const renderer = useThree(state => state.renderer)
  const {rapier, world} = useRapier()
  const currentHeight = crouching ? crouchingHeight : standingHeight
  const capsuleHalfHeight = getCapsuleHalfHeight(currentHeight, safeRadius)
  const initialFeetPosition: [number, number, number] = [position[0], position[1] - standingHeight / 2, position[2]]
  useEffect(() => {
    const read = () => {
      const body = bodyRef.current
      return body ? {
        position: body.translation(),
        velocity: physicalVelocity.current,
      } : null
    }
    playerTelemetry.read = read
    return () => {
      if (playerTelemetry.read === read) {
        playerTelemetry.read = null
      }
    }
  }, [])
  useEffect(() => {
    camera.rotation.set(0, yaw, 0, 'YXZ')
  }, [camera, yaw])
  useEffect(() => {
    const teleport = (event: Event) => {
      const {position, rotation} = (event as CustomEvent<{position: [number, number, number]
        rotation: [number, number, number, number]}>).detail
      bodyRef.current?.setTranslation({
        x: position[0],
        y: Math.max(0.04, position[1] - 1.6),
        z: position[2],
      }, true)
      bodyRef.current?.setNextKinematicTranslation({
        x: position[0],
        y: Math.max(0.04, position[1] - 1.6),
        z: position[2],
      })
      velocityRef.current.set(0, 0, 0)
      physicalVelocity.current.set(0, 0, 0)
      verticalVelocityRef.current = 0
      cameraPose.focused = false
      camera.position.set(...position)
      camera.quaternion.copy(new Quaternion(...rotation))
    }
    galleryEvents.addEventListener('teleport', teleport)
    return () => galleryEvents.removeEventListener('teleport', teleport)
  }, [camera])
  useEffect(() => {
    const controller = world.createCharacterController(Math.max(contactOffset, 0.001))
    controllerRef.current = controller
    return () => {
      if (controllerRef.current === controller) {
        controllerRef.current = null
      }
      world.removeCharacterController(controller)
    }
  }, [contactOffset, world])
  useEffect(() => {
    const controller = controllerRef.current
    if (!controller) {
      return
    }
    controller.setSlideEnabled(true)
    controller.setApplyImpulsesToDynamicBodies(pushDynamicBodies)
    controller.setCharacterMass(characterMass)
    controller.setMaxSlopeClimbAngle(clamp(maxSlopeAngle, 0, 89.9) * Math.PI / 180)
    controller.setMinSlopeSlideAngle(clamp(slideAngle, 0, 89.9) * Math.PI / 180)
    if (stepHeight > 0 && stepMinWidth > 0) {
      controller.enableAutostep(stepHeight, stepMinWidth, false)
    } else {
      controller.disableAutostep()
    }
    if (snapToGround > 0) {
      controller.enableSnapToGround(snapToGround)
    } else {
      controller.disableSnapToGround()
    }
  }, [characterMass, contactOffset, maxSlopeAngle, pushDynamicBodies, slideAngle, snapToGround, stepHeight, stepMinWidth])
  useBeforePhysicsStep(physicsWorld => {
    const body = bodyRef.current
    const collider = colliderRef.current
    const controller = controllerRef.current
    if (!body || !collider || !controller) {
      return
    }
    const dt = clamp(physicsWorld.timestep, 1 / 240, Math.max(maxDelta, 1 / 240))
    clockRef.current += dt
    const now = clockRef.current
    const keys = getKeys()
    if (globalThis.__gallery) {
      globalThis.__gallery.player = {
        keys,
        position: body.translation(),
        enabled,
        grounded: groundedRef.current,
      }
    }
    const active = enabled && !cameraPose.focused && !useGallery.getState().panel && typeof document !== 'undefined' && document.pointerLockElement !== null
    if (active && (keys.forward || keys.backward || keys.left || keys.right || keys.jump || keys.crouch || keys.sprint)) markControlled()
    const jumpHeld = active && keys.jump
    if (jumpHeld && !jumpHeldRef.current) {
      jumpBufferedUntilRef.current = now + Math.max(jumpBufferTime, 0)
    } else if (!jumpHeld && jumpHeldRef.current && verticalVelocityRef.current > 0) {
      verticalVelocityRef.current *= clamp(jumpReleaseFactor, 0, 1)
    }
    jumpHeldRef.current = jumpHeld
    const wantsCrouch = active && keys.crouch
    if (wantsCrouch && !crouchingRef.current) {
      crouchingRef.current = true
      setCrouching(true)
    } else if (!wantsCrouch && crouchingRef.current) {
      const feet = body.translation()
      const standingShape = new rapier.Capsule(getCapsuleHalfHeight(standingHeight, safeRadius), safeRadius)
      const obstruction = world.intersectionWithShape({
        x: feet.x,
        y: feet.y + standingHeight / 2,
        z: feet.z,
      }, identityRotation, standingShape, undefined, collisionGroups, collider, body, isCharacterObstacle)
      if (!obstruction) {
        crouchingRef.current = false
        setCrouching(false)
      }
    }
    const isCrouching = crouchingRef.current
    const sprinting = active && keys.sprint && !isCrouching
    const inputForward = active ? Number(keys.forward) - Number(keys.backward) : 0
    const inputRight = active ? Number(keys.right) - Number(keys.left) : 0
    const hasInput = inputForward !== 0 || inputRight !== 0
    targetVelocity.set(0, 0, 0)
    if (hasInput) {
      forward.set(0, 0, -1).applyQuaternion(camera.quaternion)
      forward.y = 0
      if (forward.lengthSq() < 0.000_001) {
        forward.set(0, 0, -1)
      } else {
        forward.normalize()
      }
      right.crossVectors(forward, up).normalize()
      targetVelocity.addScaledVector(forward, inputForward).addScaledVector(right, inputRight).normalize()
      const speedFactor = (isCrouching ? crouchFactor : 1) * (sprinting ? sprintFactor : 1)
      targetVelocity.multiplyScalar(Math.max(speed * speedFactor, 0))
    }
    horizontalVelocity.copy(velocityRef.current)
    const grounded = groundedRef.current
    const responsiveness = hasInput ? grounded ? acceleration : airAcceleration
      : grounded ? deceleration : airDeceleration
    approachHorizontal(horizontalVelocity, targetVelocity, Math.max(responsiveness, 0) * dt)
    if (grounded) {
      lastGroundedAtRef.current = now
    }
    const canJump = grounded || now - lastGroundedAtRef.current <= Math.max(coyoteTime, 0)
    const hasBufferedJump = jumpBufferedUntilRef.current >= now
    if (hasBufferedJump && canJump) {
      const jumpFactor = (isCrouching ? crouchJumpFactor : 1) * (sprinting ? sprintJumpFactor : 1)
      verticalVelocityRef.current = getJumpVelocity(Math.max(jumpHeight * jumpFactor, 0), Math.max(gravity, 0))
      jumpBufferedUntilRef.current = Number.NEGATIVE_INFINITY
      groundedRef.current = false
    } else if (grounded) {
      verticalVelocityRef.current = -Math.max(snapToGround, 0.05)
    } else {
      const gravityFactor = verticalVelocityRef.current < 0 ? Math.max(fallGravityFactor, 0) : 1
      verticalVelocityRef.current = Math.max(verticalVelocityRef.current - Math.max(gravity, 0) * gravityFactor * dt, -Math.max(maxSpeedDown, 0))
    }
    desiredMovement.x = horizontalVelocity.x * dt
    desiredMovement.y = verticalVelocityRef.current * dt
    desiredMovement.z = horizontalVelocity.z * dt
    controller.computeColliderMovement(collider, desiredMovement, undefined, collisionGroups, isCharacterObstacle)
    const movement = controller.computedMovement()
    physicalVelocity.current.set(movement.x / dt, movement.y / dt, movement.z / dt)
    const translation = body.translation()
    body.setNextKinematicTranslation({
      x: translation.x + movement.x,
      y: translation.y + movement.y,
      z: translation.z + movement.z,
    })
    velocityRef.current.set(movement.x / dt, verticalVelocityRef.current, movement.z / dt)
    const nextGrounded = controller.computedGrounded()
    groundedRef.current = nextGrounded
    if (nextGrounded) {
      lastGroundedAtRef.current = now
      if (verticalVelocityRef.current < 0) {
        verticalVelocityRef.current = 0
      }
    } else if (desiredMovement.y > 0 && movement.y + 0.0001 < desiredMovement.y) {
      verticalVelocityRef.current = 0
    }
  })
  useFrame((_, delta) => {
    const body = bodyRef.current
    if (!body) {
      return
    }
    const translation = body.translation()
    const desiredCameraHeight = crouchingRef.current ? crouchingHeight / 2 + crouchEyeHeight : standingHeight / 2 + eyeHeight
    const cameraBlend = 1 - Math.exp(-Math.max(cameraSharpness, 0) * Math.min(delta, 0.1))
    cameraHeightRef.current += (desiredCameraHeight - cameraHeightRef.current) * cameraBlend
    const horizontalSpeed = Math.hypot(velocityRef.current.x, velocityRef.current.z)
    const baseSpeed = Math.max(speed, 0.001)
    const movementAmount = groundedRef.current ? clamp(horizontalSpeed / baseSpeed, 0, 1.5) : 0
    if (movementAmount > 0.03) {
      bobPhaseRef.current += delta * Math.max(headBobFrequency, 0) * Math.PI * 2 * clamp(movementAmount, 0.6, 1.5)
    }
    const bob = Math.sin(bobPhaseRef.current) * Math.max(headBob, 0) * movementAmount
    if (movementAmount > 0.1 && Math.sin(bobPhaseRef.current) < -0.9 && useGallery.getState().sound) {
      SoundEngine.existing()?.step(['cabinet', 'amber'].includes(useGallery.getState().room))
    }
    if (!cameraPose.focused) {
      camera.position.set(translation.x, translation.y + cameraHeightRef.current + bob, translation.z)
    }
  })
  return <>
    <PointerLockControls makeDefault domElement={renderer.domElement} selector="#pointer-lock-managed-by-gallery"/>
    <RigidBody ref={bodyRef} type="kinematicPosition" userData={{kind: 'player'}} colliders={false} canSleep={false} position={initialFeetPosition}>
      <CapsuleCollider ref={colliderRef} args={[capsuleHalfHeight, safeRadius]} position={[0, currentHeight / 2, 0]} friction={0} restitution={0} collisionGroups={collisionGroups}/>
    </RigidBody>
  </>
}
export default RapierPlayer

import type {EgoOptions} from './options.ts'
import type {EgoInput, EgoPosition, EgoState} from './types.ts'
import type {RapierCollider, RapierContext, RapierRigidBody} from '@react-three/rapier'
import type {Quaternion} from 'three/webgpu'

import {Vector3} from 'three/webgpu'

import {approachHorizontal, clamp, getCapsuleHalfHeight, getJumpVelocity} from './math.ts'
import {resolveEgoOptions} from './options.ts'

const up = new Vector3(0, 1, 0)
const identityRotation = {
  x: 0,
  y: 0,
  z: 0,
  w: 1,
}

/** Owns one Rapier character controller, not the supplied world, body or collider. */
export class EgoMotor {
  private active = false
  private clock = 0
  private readonly controller
  private disposed = false
  private readonly forward = new Vector3
  private isCrouching = false
  private isGrounded = false
  private jumpBufferedUntil = Number.NEGATIVE_INFINITY
  private jumpHeld = false
  private lastGroundedAt = Number.NEGATIVE_INFINITY
  private readonly movement = new Vector3
  private options = resolveEgoOptions()
  private readonly physicalVelocity = new Vector3
  private readonly right = new Vector3
  private shapeHeight = 0
  private shapeRadius = 0
  private readonly targetVelocity = new Vector3
  private readonly velocity = new Vector3
  private verticalVelocity = 0

  constructor(private readonly rapier: RapierContext['rapier'], private readonly world: RapierContext['world'], readonly body: RapierRigidBody, private readonly collider: RapierCollider, options: EgoOptions = {}) {
    // Validate before allocating a WASM-owned controller.
    this.options = resolveEgoOptions(options)
    this.controller = world.createCharacterController(Math.max(this.options.contactOffset, 0.001))
    this.configure(options)
  }

  get crouching() {
    return this.isCrouching
  }

  get crouchingHeight() {
    return clamp(this.options.crouchHeight, this.radius * 2, this.standingHeight)
  }

  get grounded() {
    return this.isGrounded
  }

  get horizontalSpeed() {
    return Math.hypot(this.physicalVelocity.x, this.physicalVelocity.z)
  }

  get radius() {
    return Math.max(this.options.radius, 0.01)
  }

  get standingHeight() {
    return Math.max(this.options.height, this.radius * 2)
  }

  configure(options: EgoOptions) {
    this.options = resolveEgoOptions(options)
    const o = this.options
    this.controller.setOffset(Math.max(o.contactOffset, 0.001))
    this.controller.setSlideEnabled(true)
    this.controller.setApplyImpulsesToDynamicBodies(o.pushDynamicBodies)
    this.controller.setCharacterMass(o.characterMass)
    this.controller.setMaxSlopeClimbAngle(clamp(o.maxSlopeAngle, 0, 89.9) * Math.PI / 180)
    this.controller.setMinSlopeSlideAngle(clamp(o.slideAngle, 0, 89.9) * Math.PI / 180)
    if (o.stepHeight > 0 && o.stepMinWidth > 0) {
      this.controller.enableAutostep(o.stepHeight, o.stepMinWidth, false)
    } else {
      this.controller.disableAutostep()
    }
    if (o.snapToGround > 0) {
      this.controller.enableSnapToGround(o.snapToGround)
    } else {
      this.controller.disableSnapToGround()
    }
    this.collider.setCollisionGroups(o.collisionGroups ?? 0xFF_FF_FF_FF)
    this.updateShape()
  }

  dispose() {
    if (this.disposed) {
      return
    }
    this.disposed = true
    this.world.removeCharacterController(this.controller)
  }

  getState(): EgoState {
    return {
      active: this.active,
      crouching: this.isCrouching,
      grounded: this.isGrounded,
      position: {...this.body.translation()},
      velocity: {
        x: this.physicalVelocity.x,
        y: this.physicalVelocity.y,
        z: this.physicalVelocity.z,
      },
    }
  }

  step(delta: number, input: EgoInput, rotation: Quaternion, active = true) {
    if (this.disposed || !Number.isFinite(delta) || delta <= 0) {
      return
    }
    const o = this.options
    const dt = Math.min(delta, Math.max(o.maxDelta, 1 / 240))
    this.clock += dt
    const now = this.clock
    this.active = active
    const jumpHeld = active && !!input.jump
    if (!active) {
      this.jumpBufferedUntil = Number.NEGATIVE_INFINITY
    } else if (jumpHeld && !this.jumpHeld) {
      this.jumpBufferedUntil = now + Math.max(o.jumpBufferTime, 0)
    }
    if (!jumpHeld && this.jumpHeld && this.verticalVelocity > 0) {
      this.verticalVelocity *= clamp(o.jumpReleaseFactor, 0, 1)
    }
    this.jumpHeld = jumpHeld
    const wantsCrouch = active && !!input.crouch
    if (wantsCrouch) {
      this.isCrouching = true
    } else if (this.isCrouching) {
      const feet = this.body.translation()
      const standingShape = new this.rapier.Capsule(getCapsuleHalfHeight(this.standingHeight, this.radius), this.radius)
      const obstruction = this.world.intersectionWithShape({
        x: feet.x,
        y: feet.y + this.standingHeight / 2,
        z: feet.z,
      }, identityRotation, standingShape, this.rapier.QueryFilterFlags.EXCLUDE_SENSORS, o.collisionGroups, this.collider, this.body)
      if (!obstruction) {
        this.isCrouching = false
      }
    }
    // Resize synchronously before movement and clearance checks in the next substep.
    this.updateShape()
    const inputForward = active ? Number(!!input.forward) - Number(!!input.backward) : 0
    const inputRight = active ? Number(!!input.right) - Number(!!input.left) : 0
    const hasInput = inputForward !== 0 || inputRight !== 0
    let speedFactor = 1
    let jumpFactor = 1
    if (this.isCrouching) {
      speedFactor = o.crouchFactor
      jumpFactor = o.crouchJumpFactor
    } else if (active && input.sprint) {
      // Resolve opposing keys first; forward diagonals sprint, other movement dodges.
      const dodging = hasInput && inputForward <= 0
      speedFactor = dodging ? o.dodgeFactor : o.sprintFactor
      jumpFactor = dodging ? o.dodgeJumpFactor : o.sprintJumpFactor
    }
    this.targetVelocity.set(0, 0, 0)
    if (hasInput) {
      this.forward.set(0, 0, -1).applyQuaternion(rotation)
      this.forward.y = 0
      if (this.forward.lengthSq() < 0.000_001) {
        // Camera-local right retains yaw even at the vertical look limit.
        this.right.set(1, 0, 0).applyQuaternion(rotation)
        this.forward.crossVectors(up, this.right).normalize()
      } else {
        this.forward.normalize()
      }
      this.right.crossVectors(this.forward, up).normalize()
      this.targetVelocity.addScaledVector(this.forward, inputForward).addScaledVector(this.right, inputRight).normalize()
      this.targetVelocity.multiplyScalar(Math.max(o.speed * speedFactor, 0))
    }
    const grounded = this.isGrounded
    const acceleration = grounded ? o.acceleration : o.airAcceleration
    const deceleration = grounded ? o.deceleration : o.airDeceleration
    const responsiveness = hasInput ? acceleration : deceleration
    approachHorizontal(this.velocity, this.targetVelocity, Math.max(responsiveness, 0) * dt)
    if (grounded) {
      this.lastGroundedAt = now
    }
    const canJump = grounded || now - this.lastGroundedAt <= Math.max(o.coyoteTime, 0)
    if (this.jumpBufferedUntil >= now && canJump) {
      this.verticalVelocity = getJumpVelocity(o.jumpHeight * jumpFactor, o.gravity)
      this.jumpBufferedUntil = Number.NEGATIVE_INFINITY
      // Consume coyote time too, so release/repress cannot double-jump.
      this.lastGroundedAt = Number.NEGATIVE_INFINITY
      this.isGrounded = false
    } else if (grounded) {
      this.verticalVelocity = -Math.max(o.snapToGround, 0.05)
    } else {
      const gravityFactor = this.verticalVelocity < 0 ? Math.max(o.fallGravityFactor, 0) : 1
      this.verticalVelocity = Math.max(this.verticalVelocity - Math.max(o.gravity, 0) * gravityFactor * dt, -Math.max(o.maxSpeedDown, 0))
    }
    this.movement.set(this.velocity.x * dt, this.verticalVelocity * dt, this.velocity.z * dt)
    this.controller.computeColliderMovement(this.collider, this.movement, this.rapier.QueryFilterFlags.EXCLUDE_SENSORS, o.collisionGroups)
    const movement = this.controller.computedMovement()
    // Measure against the actual physics interval, even when integration catch-up is capped.
    this.physicalVelocity.set(movement.x / delta, movement.y / delta, movement.z / delta)
    const translation = this.body.translation()
    this.body.setNextKinematicTranslation({
      x: translation.x + movement.x,
      y: translation.y + movement.y,
      z: translation.z + movement.z,
    })
    this.velocity.set(movement.x / dt, 0, movement.z / dt)
    this.isGrounded = this.controller.computedGrounded()
    if (this.isGrounded) {
      this.lastGroundedAt = now
      if (this.verticalVelocity < 0) {
        this.verticalVelocity = 0
      }
    } else if (this.movement.y > 0 && movement.y + 0.0001 < this.movement.y) {
      this.verticalVelocity = 0
    }
  }

  teleport(position: EgoPosition) {
    if (!position.every(Number.isFinite)) {
      throw new RangeError('ego-player: teleport position must be finite.')
    }
    const translation = {
      x: position[0],
      y: position[1],
      z: position[2],
    }
    this.body.setTranslation(translation, true)
    this.body.setNextKinematicTranslation(translation)
    this.world.propagateModifiedBodyPositionsToColliders()
    this.body.setLinvel({
      x: 0,
      y: 0,
      z: 0,
    }, true)
    this.velocity.set(0, 0, 0)
    this.physicalVelocity.set(0, 0, 0)
    this.verticalVelocity = 0
    this.isGrounded = false
    this.lastGroundedAt = Number.NEGATIVE_INFINITY
    this.jumpBufferedUntil = Number.NEGATIVE_INFINITY
    // Keep the physical button latch: a held jump is not a new press after teleport.
  }

  private updateShape() {
    const height = this.isCrouching ? this.crouchingHeight : this.standingHeight
    if (this.shapeHeight === height && this.shapeRadius === this.radius) {
      return
    }
    this.collider.setShape(new this.rapier.Capsule(getCapsuleHalfHeight(height, this.radius), this.radius))
    this.collider.setTranslationWrtParent({
      x: 0,
      y: height / 2,
      z: 0,
    })
    this.shapeHeight = height
    this.shapeRadius = this.radius
  }
}

import type {Vec3} from '../gallery/types.ts'
import type {RigidBody, World} from '@dimforge/rapier3d-compat'

import {RigidBodyType} from '@dimforge/rapier3d-compat'

import {PropPlacement} from './PropPlacement.ts'

export type GrabbableBodyOptions = {
  attachmentBody?: () => RigidBody | undefined
  canGrab?: () => boolean
  onAttachmentChange?: (attached: boolean) => void
  recoverAsDynamic?: () => boolean
}

type BodyPose = {
  collisions: Array<boolean>
  position: Vec3
  rotation: {w: number
    x: number
    y: number
    z: number}
  type: ReturnType<RigidBody['bodyType']>
}

// Shared by sculptures, the book and detachable foliage. A canceled pluck restores
// the original fixed attachment; a canceled re-grab restores a loose dynamic leaf.
export class GrabbableBody {
  readonly placement: PropPlacement
  private home: BodyPose | null = null
  private lastClear: Vec3 | null = null
  private saved: BodyPose | null = null

  constructor(readonly body: RigidBody, world: World, private readonly options: GrabbableBodyOptions = {}) {
    this.placement = new PropPlacement(world, body, () => {
      return this.saved?.type === RigidBodyType.Fixed ? this.options.attachmentBody?.() : undefined
    })
  }

  get active() {
    return this.saved !== null
  }

  cancel() {
    if (!this.saved) {
      return
    }
    this.restore(this.saved)
    this.saved = null
  }

  grab() {
    if (this.active || this.options.canGrab?.() === false) {
      return false
    }
    this.rememberHome()
    this.saved = this.capture()
    this.lastClear = this.saved.position
    for (const collider of this.colliders()) {
      collider.setEnabled(false)
    }
    // Fixed previews avoid kinematic platform velocities pushing the player.
    this.body.setBodyType(RigidBodyType.Fixed, true)
    // Changing type does not wake sleeping props, whose meshes Rapier skips.
    this.body.wakeUp()
    this.stop()
    this.options.onAttachmentChange?.(false)
    return true
  }

  move(origin: Vec3, target: Vec3, delta: number, animate = true) {
    if (!this.active) {
      return
    }
    const destination = this.placement.constrain(origin, target)
    if (!destination) {
      return
    }
    const position = this.placement.follow(destination, delta, animate)
    if (!position) {
      return
    }
    this.translate(position)
    if (this.placement.hasRoom(position)) {
      this.lastClear = position
    }
  }

  recover() {
    this.rememberHome()
    if (!this.active && this.home && this.body.translation().y < -4) {
      // A leaf cannot reattach to an anchor that has itself been picked up or thrown.
      const home = this.options.recoverAsDynamic?.() ? {
        ...this.home,
        type: RigidBodyType.Dynamic,
        collisions: this.home.collisions.map(() => true),
      } : this.home
      this.restore(home)
    }
  }

  release(throwing: boolean, direction: Vec3) {
    if (!this.saved) {
      return false
    }
    const current = this.body.translation()
    let returned = false
    if (!this.placement.hasRoom([current.x, current.y, current.z])) {
      const fallback = this.lastClear && this.placement.hasRoom(this.lastClear) ? this.lastClear : this.saved.position
      // An embedded root may not have cleared its pot yet. Restore the attachment
      // instead of enabling an overlapping dynamic body inside the solid pot hull.
      if (!this.placement.hasRoom(fallback)) {
        this.cancel()
        return true
      }
      this.translate(fallback)
      returned = true
    }
    this.saved = null
    this.body.setBodyType(RigidBodyType.Dynamic, true)
    for (const collider of this.colliders()) {
      collider.setEnabled(true)
    }
    this.body.wakeUp()
    this.body.setLinvel({
      x: direction[0] * (throwing ? 10 : 0),
      y: throwing ? direction[1] * 10 + 2 : 0,
      z: direction[2] * (throwing ? 10 : 0),
    }, true)
    this.body.setAngvel({
      x: throwing ? 3 : 0,
      y: throwing ? 2 : 0,
      z: throwing ? 1 : 0,
    }, true)
    return returned
  }

  rememberHome() {
    // Auto-generated colliders are installed after the rigid body’s mount effect.
    if (!this.home && this.body.numColliders()) {
      this.home = this.capture()
    }
  }

  private capture(): BodyPose {
    const p = this.body.translation()
    return {
      position: [p.x, p.y, p.z],
      rotation: this.body.rotation(),
      type: this.body.bodyType(),
      collisions: this.colliders().map(collider => collider.isEnabled()),
    }
  }

  private colliders() {
    return Array.from({length: this.body.numColliders()}, (_, i) => this.body.collider(i))
  }

  private restore(pose: BodyPose) {
    this.body.setBodyType(pose.type, true)
    this.translate(pose.position)
    this.body.setRotation(pose.rotation, true)
    for (const [i, collider] of this.colliders().entries()) {
      collider.setEnabled(pose.collisions[i] ?? false)
    }
    this.stop()
    this.body.wakeUp()
    this.options.onAttachmentChange?.(pose.type === RigidBodyType.Fixed)
  }

  private stop() {
    this.body.setLinvel({
      x: 0,
      y: 0,
      z: 0,
    }, true)
    this.body.setAngvel({
      x: 0,
      y: 0,
      z: 0,
    }, true)
  }

  private translate(position: Vec3) {
    this.body.setTranslation({
      x: position[0],
      y: position[1],
      z: position[2],
    }, false)
  }
}

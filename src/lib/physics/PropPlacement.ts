import type {Collider, RigidBody, World} from '@dimforge/rapier3d-compat'
import type {Vec3} from '../gallery/types.ts'

import {Quaternion, Vector3} from 'three/webgpu'

const skin = 0.025

export class PropPlacement {
  constructor(readonly world: World, readonly body: RigidBody, private readonly extractionAnchor?: () => RigidBody | undefined) {}

  private obstacle = (collider: Collider) => collider.isEnabled() && !collider.isSensor()

  private carryObstacle = (collider: Collider) => {
    const data = collider.parent()?.userData
    const player = data && typeof data === 'object' && 'kind' in data && data.kind === 'player'
    const anchor = this.extractionAnchor?.()
    return this.obstacle(collider) && !player && (!anchor || collider.parent()?.handle !== anchor.handle)
  }

  private shapes(position: Vec3) {
    const rotation = this.body.rotation()
    const parentRotation = new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)
    return Array.from({length: this.body.numColliders()}, (_, i) => {
      const collider = this.body.collider(i)
      const offset = collider.translationWrtParent()!
      const rotation = collider.rotationWrtParent()!
      return {
        shape: collider.shape,
        center: new Vector3(offset.x, offset.y, offset.z).applyQuaternion(parentRotation).add(new Vector3(...position)),
        orientation: parentRotation.clone().multiply(new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)),
      }
    })
  }

  hasRoom(position: Vec3, includePlayer = true) {
    const predicate = includePlayer ? this.obstacle : this.carryObstacle
    return this.shapes(position).every(({center, orientation, shape}) => !this.world.intersectionWithShape(center, orientation, shape, undefined, undefined, undefined, this.body, predicate))
  }

  private sweep(origin: Vec3, direction: Vector3, distance: number, clearance = skin) {
    let nearest: {hit: NonNullable<ReturnType<World['castShape']>>
      center: Vector3
      orientation: Quaternion} | null = null
    for (const {center, orientation, shape} of this.shapes(origin)) {
      const hit = this.world.castShape(center, orientation, direction, shape, clearance, distance, false, undefined, undefined, undefined, this.body, this.carryObstacle)
      if (hit) {
        distance = Math.max(0, hit.time_of_impact)
        nearest = {hit, center, orientation}
      }
    }
    return nearest
  }

  constrain(origin: Vec3, target: Vec3): Vec3 | null {
    const direction = new Vector3(...target).sub(new Vector3(...origin))
    let distance = direction.length()
    direction.normalize()
    // Sweep every part of the object, including offset covers and labels. A center ray
    // misses pedestals below the sightline and lets the book’s edges enter the stone.
    const collision = this.sweep(origin, direction, distance)
    if (collision) distance = Math.max(0, collision.hit.time_of_impact)
    const position = new Vector3(...origin).addScaledVector(direction, distance).toArray() as Vec3
    // In a space narrower than the prop, keep its previous pose rather than pushing
    // geometry through an obstacle. Release still checks the player as well.
    return this.hasRoom(position, false) ? position : null
  }

  follow(target: Vec3, delta: number): Vec3 | null {
    const current = this.body.translation()
    const position = new Vector3(current.x, current.y, current.z)
    if (!Number.isFinite(delta) || delta <= 0) return position.toArray()
    const dt = Math.min(delta, 0.05)
    const movement = new Vector3(...target).sub(position)
    // About 95% settled in 125 ms, independent of refresh rate. Limit both
    // long-distance pickups and resumed frames so neither produces a one-frame jump.
    let budget = Math.min(movement.length() * -Math.expm1(-24 * dt), 20 * dt)
    movement.clampLength(0, budget)
    for (let i = 0; i < 3 && movement.lengthSq() > 1e-12; i++) {
      const direction = movement.clone().normalize()
      const collision = this.sweep(position.toArray(), direction, movement.length())
      if (!collision) {
        position.add(movement)
        break
      }
      const {hit, center, orientation} = collision
      const travel = Math.max(0, hit.time_of_impact)
      position.addScaledVector(direction, travel)
      budget = Math.max(0, budget - travel)
      const normal = new Vector3(hit.normal1.x, hit.normal1.y, hit.normal1.z).normalize()
      // Rapier reports the obstacle witness in world space and the moving witness
      // in shape-local space. Ease a resting book out of its tiny contact overlap.
      const witness = new Vector3(hit.witness2.x, hit.witness2.y, hit.witness2.z).applyQuaternion(orientation).add(center).addScaledVector(direction, travel)
      const separation = witness.sub(new Vector3(hit.witness1.x, hit.witness1.y, hit.witness1.z)).dot(normal)
      let lift = Math.min(budget, Math.max(0, skin - separation) + 0.0001)
      const obstruction = this.sweep(position.toArray(), normal, lift, 0)
      if (obstruction) lift = Math.min(lift, Math.max(0, obstruction.hit.time_of_impact))
      position.addScaledVector(normal, lift)
      budget = Math.max(0, budget - lift)
      movement.addScaledVector(direction, -travel)
      const intoSurface = movement.dot(normal)
      if (intoSurface < 0) movement.addScaledVector(normal, -intoSurface)
      movement.clampLength(0, budget)
    }
    const result = position.toArray() as Vec3
    return this.hasRoom(result, false) ? result : null
  }
}

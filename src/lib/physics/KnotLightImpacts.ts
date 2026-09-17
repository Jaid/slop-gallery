import type {Collider, RigidBody, TempContactManifold, World} from '@dimforge/rapier3d-compat'

import {Vector3} from 'three/webgpu'

import {bodyThrow} from './ThrowState.ts'

export type KnotLightImpact = {
  attackId: number
  mass: number
  point: Vector3
  speed: number
  velocity: Vector3
}
type Motion = {
  angular: Vector3
  attackId: number
  center: Vector3
  linear: Vector3
}

/** Samples each physics substep, rather than React Rapier's frame-batched collision events. */
export default class KnotLightImpacts {
  private readonly fixtures = new WeakMap<Collider, number>
  private readonly motions = new Map<RigidBody, Motion>

  capture(world: World) {
    this.motions.clear()
    world.forEachActiveRigidBody(body => {
      const attack = bodyThrow(body)
      if (attack && body.isDynamic()) {
        this.motions.set(body, {
          attackId: attack.id,
          center: (new Vector3).copy(body.worldCom()),
          linear: (new Vector3).copy(body.linvel()),
          angular: (new Vector3).copy(body.angvel()),
        })
      }
    })
  }

  collect(world: World, onImpact: (index: number, impact: KnotLightImpact) => void) {
    for (const [body, motion] of this.motions) {
      if (!body.isValid() || bodyThrow(body)?.id !== motion.attackId) {
        continue
      }
      for (let i = 0; i < body.numColliders(); i++) {
        const projectile = body.collider(i)
        world.contactPairsWith(projectile, fixture => {
          const index = this.fixtures.get(fixture)
          if (index === undefined) {
            return
          }
          world.contactPair(fixture, projectile, manifold => {
            if (manifold.numContacts() || manifold.numSolverContacts()) {
              onImpact(index, this.read(fixture, body, manifold, motion))
            }
          })
        })
      }
    }
  }

  register(collider: Collider | null, index: number) {
    if (collider) {
      // Collider objects, not recycled numeric handles: removed faces cannot alias new debris.
      this.fixtures.set(collider, index)
    }
  }

  private read(fixture: Collider, body: RigidBody, manifold: TempContactManifold, motion: Motion): KnotLightImpact {
    // Solver points are world-space, unlike the ambiguous local points in symmetric callbacks.
    const point = new Vector3
    let contacts = 0
    for (let i = 0; i < manifold.numSolverContacts(); i++) {
      const contact = manifold.solverContactPoint(i)
      if (!contact) {
        continue
      }
      point.add(contact)
      contacts++
    }
    if (contacts) {
      point.divideScalar(contacts)
    } else {
      const projection = fixture.projectPoint(body.translation(), true)
      point.copy(projection?.point ?? body.translation())
    }
    const velocity = (new Vector3).crossVectors(motion.angular, point.clone().sub(motion.center)).add(motion.linear)
    const normal = (new Vector3).copy(manifold.normal())
    return {
      attackId: motion.attackId,
      mass: body.mass(),
      point,
      speed: Math.abs(velocity.dot(normal)),
      velocity,
    }
  }
}

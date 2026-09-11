import type {Collider} from '@dimforge/rapier3d-compat'

// Attached or held foliage is decorative; loose pieces must keep colliding even
// when a geometry update recreates their colliders on an existing dynamic body.
export default function initializeFoliageCollider(collider: Collider | null) {
  collider?.setEnabled(collider.parent()?.isDynamic() ?? false)
}

import type {OrbitSettings} from '#src/lib/camera/OrbitInspection.ts'
import type {Vec3} from '#src/lib/gallery.ts'
import type {RapierRigidBody} from '@react-three/rapier'
import type {Object3D} from 'three/webgpu'

export type Orbitable = {
  /** the object’s own physics body, which never counts as the floor below it */
  body?: RapierRigidBody
  /** where the orbit centers, relative to the group */
  center?: Vec3
  group: Object3D
  orbit: OrbitSettings
  /** short display name for the interaction hint */
  title: string
}

/** Objects that holding V orbits around, each with its own distances and limits. */
export const orbitables = new Map<string, Orbitable>
export function registerOrbitable(id: string, object: Orbitable) {
  orbitables.set(id, object)
  return () => {
    if (orbitables.get(id) === object) {
      orbitables.delete(id)
    }
  }
}

import type {RigidBody} from '@dimforge/rapier3d-compat'

export type BodyThrow = {
  id: number
}

const throws = new WeakMap<RigidBody, BodyThrow>
let nextId = 1

export function beginBodyThrow(body: RigidBody): BodyThrow {
  const state = {id: nextId++}
  throws.set(body, state)
  return state
}

export function clearBodyThrow(body: RigidBody) {
  throws.delete(body)
}

export function bodyThrow(body: RigidBody) {
  return throws.get(body)
}

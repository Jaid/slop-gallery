import type {RapierRigidBody} from '@react-three/rapier'

export type EgoAction = 'backward' | 'crouch' | 'forward' | 'jump' | 'left' | 'right' | 'sprint'
/** Omitted actions are inactive. The reader may return a shared input object. */
export type EgoInput = Readonly<Partial<Record<EgoAction, boolean>>>
export type EgoInputReader = () => EgoInput
export type EgoToggle = (() => boolean) | boolean
export type EgoPosition = readonly [number, number, number]
export type EgoRotation = readonly [number, number, number, number]
export type EgoPoint = Readonly<{x: number
  y: number
  z: number}>
export type EgoState = Readonly<{
  active: boolean
  crouching: boolean
  grounded: boolean
  /** World-space feet position. */
  position: EgoPoint
  /** Collision-resolved physical velocity, excluding camera motion. */
  velocity: EgoPoint
}>
export type EgoPlayerHandle = {
  readonly body: RapierRigidBody | null
  /** A detached snapshot, or null before the body is ready. */
  getState: () => EgoState | null
  /** World-space feet position and optional camera quaternion. Resets momentum and jump history. */
  teleport: (position: EgoPosition, rotation?: EgoRotation) => void
}

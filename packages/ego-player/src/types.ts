import type {EgoDump} from './EgoDiagnostics.ts'
import type {RapierRigidBody} from '@react-three/rapier'

export type EgoAction = 'backward' | 'crouch' | 'dump' | 'forward' | 'interact' | 'jump' | 'left' | 'modifier' | 'right' | 'sprint' | 'zoom'
/** Omitted actions are inactive. The reader may return a shared input object. */
export type EgoInput = Readonly<Partial<Record<EgoAction, boolean>>>
export type EgoInputReader = () => EgoInput
export type EgoToggle = (() => boolean) | boolean
export type EgoPosition = readonly [number, number, number]
export type EgoRotation = readonly [number, number, number, number]
export type EgoPoint = Readonly<{
  x: number
  y: number
  z: number
}>
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
  /** The same detached diagnostic snapshot the dump action produces, with the current input, or null before the body is ready. Works without `onDump`. */
  dump: () => EgoDump | null
  /** A detached snapshot, or null before the body is ready. */
  getState: () => EgoState | null
  /** Restore zoom before another camera controller snapshots the current FOV. */
  releaseZoom: () => void
  /** World-space feet position and optional camera quaternion. Resolves capsule clearance, then resets momentum and jump history. */
  teleport: (position: EgoPosition, rotation?: EgoRotation) => void
}

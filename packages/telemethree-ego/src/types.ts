import type Telemetry from 'telemethree'
import type {Attributes} from 'telemethree'

export type Point3 = Readonly<{x: number
  y: number
  z: number}>
export type Aim = {
  direction: Point3
  hit?: {distance: number
    point: Point3} | null
  origin: Point3
}
export type EgoSample = {
  aim?: Aim
  /** Set for a teleport or other discontinuity when deriving velocity from positions. */
  discontinuity?: boolean
  position: Point3
  /** World-space physical velocity in world units per second; preferred over differentiation. */
  velocity?: Point3
}
export type EgoTelemetryOptions = {
  attributes?: Attributes
  intervalMs?: number
  maxVelocityGapMs?: number
  metersPerUnit?: number
  now?: () => number
  read: () => EgoSample | null
  telemetry: Telemetry
}

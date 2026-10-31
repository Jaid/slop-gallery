import type {FusionOutcome} from './Fusion.ts'
import type {PortalFrame} from './portalFrame.ts'
import type {FusionTiming} from './timing.ts'

import {clamp, fade} from 'math'
import {Matrix4, Quaternion, Vector3} from 'three/webgpu'

/** radians per second the satellites circle the portal at while it brews */
export const orbitSpeed = 1.45
/** how many more radians per second cubed the satellites gain as they spiral into the portal during the climax */
const spinUp = 4.2
/** the share of the climax after which the satellites start shrinking into the portal */
const shrinkFrom = 0.35
/** the share of the fizzle the orbit stutters on before the work flies home and the rest is spat out */
export const fizzleRelease = 0.3

/** something orbiting a fusion’s portal: the work or what was thrown into it */
export type SatelliteOrbit = {
  /** where it rests when the fusion hands it back, for the work its spot on the wall; others don’t return */
  home?: Pose
  /** its orbit angle when the fusion starts, opposite of the other one’s */
  phase: number
  /** how much it shrinks while orbiting */
  scale: number
  /** its pose in the world when the fusion seized it */
  start: Pose
  /** the axis a prop tumbles around while orbiting; works face the room instead */
  tumble?: Vector3
}
export type Pose = {
  position: Vector3
  quaternion: Quaternion
}
export type SatellitePose = Pose & {scale: number}

const up = new Vector3(0, 1, 0)
const x = new Vector3
const y = new Vector3
const z = new Vector3
const basis = new Matrix4
const roll = new Quaternion
const turn = new Quaternion
const target = new Quaternion
const normal = new Vector3
const tangent = new Vector3
const from = {
  position: new Vector3,
  quaternion: new Quaternion,
  scale: 1,
}

/** The orbit angle `elapsed` seconds into a fusion, speeding up through a climax that starts `at` seconds in. */
export function orbitAngle(phase: number, elapsed: number, climax?: {
  at: number
  duration: number
}) {
  if (!climax || elapsed <= climax.at) {
    return phase + orbitSpeed * elapsed
  }
  const progress = clamp((elapsed - climax.at) / climax.duration, 0, 1)
  return phase + orbitSpeed * climax.at + climax.duration * (orbitSpeed * progress + spinUp * progress ** 3)
}

/** Where on the orbit the angle lies, `reach` of the way out from the portal’s middle. Its side toward the room passes lower, its side toward the wall higher. */
export function orbitPoint(frame: PortalFrame, angle: number, reach: number, out: Vector3) {
  const {along, across, tilt} = frame.orbit
  const cos = Math.cos(angle) * reach
  const sin = Math.sin(angle) * reach
  return out.fromArray(frame.center)
    .addScaledVector(tangent.fromArray(frame.tangent), along * cos)
    .addScaledVector(normal.fromArray(frame.normal), across * sin)
    .addScaledVector(up, -tilt * sin)
}

/** How a work at the point faces: toward the room, turned a little out from the portal, rocking gently around its own axis. */
export function orbitFacing(frame: PortalFrame, point: Vector3, wobble: number, out: Quaternion) {
  z.fromArray(frame.center).subVectors(point, z).multiplyScalar(0.55).add(normal.fromArray(frame.normal)).normalize()
  x.crossVectors(up, z).normalize()
  y.crossVectors(z, x)
  out.setFromRotationMatrix(basis.makeBasis(x, y, z))
  return out.multiply(roll.setFromAxisAngle(z.set(0, 0, 1), wobble))
}

/**
 * The satellite’s pose in the world `elapsed` seconds into the fusion: it flies from where it was seized into orbit while the portal opens, circles the portal and, on success, spirals into it during the climax, shrinking away.
 * On failure, the orbit stutters through the first part of the fizzle; then the work flies home to its wall, while anything else is spat out, which the caller does.
 */
export function satellitePose(frame: PortalFrame, timing: FusionTiming, satellite: SatelliteOrbit, elapsed: number, outcome: FusionOutcome | undefined, out: SatellitePose): SatellitePose {
  if (outcome?.kind === 'success' && elapsed > outcome.at) {
    const progress = clamp((elapsed - outcome.at) / timing.climax, 0, 1)
    const angle = orbitAngle(satellite.phase, elapsed, {
      at: outcome.at,
      duration: timing.climax,
    })
    orbiting(frame, satellite, elapsed, angle, (1 - progress) ** 2, out)
    out.scale = satellite.scale * (1 - fade(clamp((progress - shrinkFrom) / (0.95 - shrinkFrom), 0, 1)))
    return out
  }
  if (outcome?.kind === 'failure' && elapsed > outcome.at) {
    const progress = clamp((elapsed - outcome.at) / timing.fizzle, 0, 1)
    if (progress <= fizzleRelease || !satellite.home) {
      return stuttering(frame, timing, satellite, elapsed, outcome.at, progress, out)
    }
    const released = outcome.at + fizzleRelease * timing.fizzle
    stuttering(frame, timing, satellite, released, outcome.at, fizzleRelease, from)
    const homing = fade((progress - fizzleRelease) / (1 - fizzleRelease))
    out.position.lerpVectors(from.position, satellite.home.position, homing).addScaledVector(normal.fromArray(frame.normal), Math.sin(Math.PI * homing) * 0.25)
    out.quaternion.slerpQuaternions(from.quaternion, satellite.home.quaternion, homing)
    out.scale = from.scale + (1 - from.scale) * homing
    return out
  }
  orbiting(frame, satellite, elapsed, orbitAngle(satellite.phase, elapsed), 1, out)
  if (elapsed >= timing.gather) {
    return out
  }
  // Gathering: from where it was seized, out from the wall in an arc and into its orbit.
  const gathered = fade(clamp(elapsed / timing.gather, 0, 1))
  out.position.lerpVectors(satellite.start.position, out.position, gathered).addScaledVector(normal.fromArray(frame.normal), Math.sin(Math.PI * gathered) * 0.35)
  out.quaternion.slerpQuaternions(satellite.start.quaternion, target.copy(out.quaternion), gathered)
  out.scale = 1 + (satellite.scale - 1) * gathered
  return out
}

/** The satellite’s pose while it orbits freely, `reach` of the way out. */
function orbiting(frame: PortalFrame, satellite: SatelliteOrbit, elapsed: number, angle: number, reach: number, out: SatellitePose) {
  orbitPoint(frame, angle, reach, out.position)
  if (satellite.tumble) {
    out.quaternion.copy(satellite.start.quaternion).premultiply(turn.setFromAxisAngle(satellite.tumble, elapsed * 1.9))
  } else {
    orbitFacing(frame, out.position, Math.sin(elapsed * 1.3 + satellite.phase * 2) * 0.16, out.quaternion)
  }
  out.scale = satellite.scale
  return out
}
/** The orbit running down and shuddering through the start of a fizzle, `progress` of the way through it. */
function stuttering(frame: PortalFrame, timing: FusionTiming, satellite: SatelliteOrbit, elapsed: number, failedAt: number, progress: number, out: SatellitePose) {
  const stutter = Math.min(progress, fizzleRelease) * timing.fizzle
  const angle = orbitAngle(satellite.phase, failedAt) + orbitSpeed * (stutter - stutter ** 2 / (2 * fizzleRelease * timing.fizzle) * 0.8)
  return orbiting(frame, satellite, elapsed, angle, 1 + Math.sin(elapsed * 47) * 0.035, out)
}

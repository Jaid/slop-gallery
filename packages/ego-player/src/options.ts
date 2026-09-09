export type EgoOptions = {
  acceleration?: number
  airAcceleration?: number
  airDeceleration?: number
  cameraSharpness?: number
  characterMass?: number | null
  collisionGroups?: number
  contactOffset?: number
  coyoteTime?: number
  crouchEyeHeight?: number
  crouchFactor?: number
  crouchHeight?: number
  crouchJumpFactor?: number
  deceleration?: number
  /** Speed multiplier for boosted sideways/backward movement. */
  dodgeFactor?: number
  /** Jump-height multiplier for boosted sideways/backward movement. */
  dodgeJumpFactor?: number
  eyeHeight?: number
  fallGravityFactor?: number
  gravity?: number
  headBob?: number
  headBobFrequency?: number
  height?: number
  jumpBufferTime?: number
  jumpHeight?: number
  jumpReleaseFactor?: number
  maxDelta?: number
  maxSlopeAngle?: number
  maxSpeedDown?: number
  pushDynamicBodies?: boolean
  radius?: number
  slideAngle?: number
  snapToGround?: number
  speed?: number
  sprintFactor?: number
  sprintJumpFactor?: number
  stepHeight?: number
  stepMinWidth?: number
}

export const defaultEgoOptions = Object.freeze({
  acceleration: 18,
  airAcceleration: 6,
  airDeceleration: 1.5,
  cameraSharpness: 18,
  characterMass: 80,
  contactOffset: 0.02,
  coyoteTime: 0.12,
  crouchEyeHeight: 0.9,
  crouchFactor: 0.7,
  crouchHeight: 1,
  crouchJumpFactor: 0.4,
  deceleration: 22,
  dodgeFactor: 1.5,
  dodgeJumpFactor: 1.1,
  eyeHeight: 1.6,
  fallGravityFactor: 1.35,
  gravity: 9.81,
  headBob: 0.018,
  headBobFrequency: 1.8,
  height: 1.6,
  jumpBufferTime: 0.14,
  jumpHeight: 1.5,
  jumpReleaseFactor: 0.55,
  maxDelta: 0.05,
  maxSlopeAngle: 50,
  maxSpeedDown: 30,
  pushDynamicBodies: true,
  radius: 0.3,
  slideAngle: 55,
  snapToGround: 0.18,
  speed: 3,
  sprintFactor: 3,
  sprintJumpFactor: 1.3,
  stepHeight: 0.3,
  stepMinWidth: 0.2,
} satisfies Required<Omit<EgoOptions, 'collisionGroups'>>)

export function resolveEgoOptions(options: EgoOptions = {}) {
  const resolved = {
    ...defaultEgoOptions,
    ...Object.fromEntries(Object.entries(options).filter((entry: [string, unknown]) => entry[1] !== undefined)),
  } as Required<Omit<EgoOptions, 'collisionGroups'>> & Pick<EgoOptions, 'collisionGroups'>
  for (const [name, value] of Object.entries(resolved)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new RangeError(`ego-player: ${name} must be finite.`)
    }
  }
  return resolved
}

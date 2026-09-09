// Shared tuning for the current destructible specimens; no geometry is allocated here.
export const leafPhysics = {
  mass: 0.008,
  gravityScale: 0.65,
  linearDamping: 1.2,
  angularDamping: 0.6,
  restitution: 0.1,
  friction: 0.9,
} as const

export const potPhysics = {
  mass: 4.6,
  restitution: 0.18,
  friction: 0.85,
} as const

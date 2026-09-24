export const knotBillboardPhysics = {
  solverIterations: 12,
  stand: {
    angularDamping: 0.7,
    colliderMass: 10,
    friction: 0.95,
    linearDamping: 0.5,
    restitution: 0.05,
  },
  sign: {
    angularDamping: 0.08,
    friction: 0.75,
    linearDamping: 0.08,
    mass: 8,
    restitution: 0.05,
    standGap: 0.01,
  },
} as const

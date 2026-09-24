export const knotBillboardPhysics = {
  solverIterations: 12,
  stand: {
    colliderMass: 4,
    friction: 0.7,
    linearDamping: 0.4,
    maxDisplacement: 0.06,
    springDamping: 650,
    springStiffness: 12_000,
  },
  sign: {
    angularDamping: 0.5,
    hingeLimit: 0.04,
    linearDamping: 0.3,
    mass: 10,
    motorDamping: 12,
    motorStiffness: 70,
  },
} as const

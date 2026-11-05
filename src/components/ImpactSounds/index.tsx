import {useAfterPhysicsStep, useBeforePhysicsStep} from '@react-three/rapier'

import {impactSounds} from '#src/lib/audio/impactSounds.ts'

/** Sounds what orbs and loose works strike, sampling their motion around every physics step. */
export default function ImpactSounds() {
  useBeforePhysicsStep(world => impactSounds.capture(world))
  useAfterPhysicsStep(world => impactSounds.collect(world))
  return null
}

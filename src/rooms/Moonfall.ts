import type {Lamp} from './base/Room.ts'

import MoonfallOrbitAmbience from '#src/lib/audio/ambience/MoonfallOrbit.ts'
import lowerGallery from '#src/lib/gallery/lowerGallery.ts'
import {craterTerrain} from '#src/lib/gallery/moonfall/CraterTerrain.ts'

import Room from './base/Room.ts'
import floorBox from './lib/floorBox.ts'
import floorOrigin from './lib/floorOrigin.ts'
import southSpawn from './lib/southSpawn.ts'

const {floorY, moonfall: plan} = lowerGallery
const bottom = craterTerrain.lowest()
const wallLed = {
  tint: '#91c9c4',
} as const
const westWallLed = (z: number) => ({
  ...wallLed,
  position: [-13.225, 2.8, z],
  strength: 5,
  range: 6,
}) satisfies Lamp
const eastWallLed = (z: number) => ({
  ...wallLed,
  position: [13.225, 2.2, z],
  strength: 15,
  range: 10,
}) satisfies Lamp

export default class Moonfall extends Room {
  override readonly description = 'Down the stairs. Out of the ordinary.'
  // Reaches down to the deepest air in the crater.
  override readonly fence = floorBox(plan.size, bottom, 5.8 - bottom)
  override readonly id = 'moonfall'
  override readonly origin = floorOrigin(plan, floorY)
  override readonly spawn = southSpawn(plan.size)

  constructor() {
    super({
      number: 6,
      title: 'Moonfall',
      ambience: {
        // A celestial hum from the orbital sculpture’s core.
        'orbital-sculpture': {
          emitter: MoonfallOrbitAmbience,
          position: [0, 2.5, 0],
        },
      },
      lamps: {
        // Four wall LEDs down the west wall, leaving its middle dark.
        'wall-west-1': westWallLed(-10),
        'wall-west-2': westWallLed(-5),
        'wall-west-3': westWallLed(5),
        'wall-west-4': westWallLed(10),
        // On the east only the pair flanking the stair door, hanging lower and brighter.
        'wall-east-north': eastWallLed(-3.6),
        'wall-east-south': eastWallLed(3.6),
        spotlight: {
          kind: 'spot',
          position: [-7, 3.3, -4],
          target: [0, -1.5, 0],
          angle: 0.9,
          penumbra: 0.28,
          strength: 860,
          tint: '#e0d0b2',
          range: 15,
          shadow: true,
        },
        // The planet’s glow, rising from the crater, throws the orbital sculpture’s shadow onto the ceiling.
        'planet-glow': {
          position: [5.37, 1.02, -0.19],
          strength: 216,
          tint: '#64bfb5',
          range: 20,
          decay: 1.25,
          shadow: true,
        },
        ember: {
          position: [6, 2.6, 6.15],
          strength: 27,
          tint: '#af7e5f',
          range: 15,
          decay: 1,
        },
      },
      // The room lies under its own ceiling, so the sun never lights its air.
      volumetricSun: 0,
    })
  }
}

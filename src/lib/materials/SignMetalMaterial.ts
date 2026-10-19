import BrushedMetalMaterial, {unlitMetal} from './metal/BrushedMetalMaterial.ts'
import {geometryGrain} from './metal/grain.ts'
import knottinghamSurroundings from './metal/knottinghamRoom.ts'

/**
 * Satin stainless steel for the Knottingham nameplate stands: a stem brushed along its length, a lathe-turned foot, sleeve and boss, and a plaque backing brushed side to side, all mirroring the checkered marble, crimson walls and LED panels of the room.
 *
 * Fast graphics get the unlit counterpart, which keeps the mirrored room but skips lights, grain and roughness blur.
 */
export const signSupportMaterial = (isHeavy: boolean) => {
  const options = {
    surroundings: {
      ...knottinghamSurroundings,
      contact: 0.35,
    },
    roughness: 0.26,
  }
  if (isHeavy) {
    return new BrushedMetalMaterial({
      ...options,
      name: 'Knot nameplate brushed steel',
      grain: geometryGrain,
      anisotropy: 0.7,
    })
  }
  return unlitMetal({
    ...options,
    name: 'Knot nameplate unlit steel',
  })
}

import type {DestructiblePlantKind} from '../destructiblePlants/catalog.ts'
import type {Vec3} from '../types.ts'
import type {PlantKind, PotKind} from './catalog.ts'

import destructiblePlants from '../destructiblePlants/catalog.ts'
import {plants} from './catalog.ts'

export type PottedPlantKind = DestructiblePlantKind | PlantKind
export type PotPlacement = {
  id: string
  position: Vec3
  pot: PotKind
}

export const pottedPlantKinds: Array<PottedPlantKind> = [...plants, ...destructiblePlants].map(plant => plant.id)

export const potPlacements: Array<PotPlacement> = [
  {
    id: 'prop-dine-southwest-plant',
    pot: 'ivory',
    // Keep even the widest canopy clear of both corner walls.
    position: [8.95, 0.001, 7.1],
  },
  {
    id: 'prop-dine-northeast-plant',
    pot: 'ivory',
    position: [19.05, 0.001, -7.05],
  },
  {
    id: 'prop-lobby-northwest-plant',
    pot: 'celadon',
    position: [-7.09, 0, -7.01],
  },
  {
    id: 'prop-lobby-northeast-plant',
    pot: 'celadon',
    position: [7.09, 0, -7.01],
  },
]

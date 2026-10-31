import type {PotPlacement, PottedPlantKind} from '#src/lib/gallery/plantDecorations/placements.ts'

import DestructiblePlant from '#component/DestructiblePlant'
import PlantDecoration from '#component/PlantDecoration'
import {pottedPlantKind} from '#src/lib/gallery/plantDecorations/placements.ts'
import {environmentSeed} from '#src/lib/gameSeed.ts'

const destructibleKinds = ['snake', 'calathea', 'birdOfParadise', 'peaceLily'] as const

export default function PottedPlant({id, pot, position}: PotPlacement) {
  const plant = pottedPlantKind(environmentSeed, id)
  if (isDestructible(plant)) {
    return <DestructiblePlant key={plant} id={id} kind={plant} position={position} pot={pot} />
  }
  return <group key={plant} name={id}><PlantDecoration plant={plant} position={position} pot={pot} /></group>
}

function isDestructible(plant: PottedPlantKind): plant is typeof destructibleKinds[number] {
  return (destructibleKinds as ReadonlyArray<PottedPlantKind>).includes(plant)
}

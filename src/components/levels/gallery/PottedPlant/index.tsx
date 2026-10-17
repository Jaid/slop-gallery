import type {PotPlacement, PottedPlantKind} from '#src/lib/gallery/plantDecorations/placements.ts'

import DestructiblePlant from '#component/levels/gallery/DestructiblePlant'
import PlantDecoration from '#component/levels/gallery/PlantDecoration'
import {useEnvironmentSeed, useGallery} from '#src/lib/gallery.ts'
import {pottedPlantKind} from '#src/lib/gallery/plantDecorations/placements.ts'

const destructibleKinds = ['snake', 'calathea', 'birdOfParadise', 'peaceLily'] as const

export default function PottedPlant({id, pot, position}: PotPlacement) {
  const plant = pottedPlantKind(useEnvironmentSeed(), id)
  const resetEpoch = useGallery(s => s.resetEpoch)
  if (isDestructible(plant)) {
    return <DestructiblePlant key={`${plant}-${resetEpoch}`} id={id} kind={plant} position={position} pot={pot} />
  }
  return <group key={plant} name={id}><PlantDecoration plant={plant} position={position} pot={pot} /></group>
}

function isDestructible(plant: PottedPlantKind): plant is typeof destructibleKinds[number] {
  return (destructibleKinds as ReadonlyArray<PottedPlantKind>).includes(plant)
}

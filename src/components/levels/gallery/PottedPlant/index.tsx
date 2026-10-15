import type {PotPlacement, PottedPlantKind} from '#src/lib/gallery/plantDecorations/placements.ts'

import {sample} from 'es-toolkit'
import {useState} from 'react'

import DestructiblePlant from '#component/levels/gallery/DestructiblePlant'
import PlantDecoration from '#component/levels/gallery/PlantDecoration'
import {useGallery} from '#src/lib/gallery.ts'
import {pottedPlantKinds} from '#src/lib/gallery/plantDecorations/placements.ts'

const destructibleKinds = ['snake', 'calathea', 'birdOfParadise', 'peaceLily'] as const

export default function PottedPlant({id, pot, position}: PotPlacement) {
  const [plant] = useState(() => sample(pottedPlantKinds))
  const resetEpoch = useGallery(s => s.resetEpoch)
  if (isDestructible(plant)) {
    return <DestructiblePlant key={resetEpoch} id={id} kind={plant} position={position} pot={pot} />
  }
  return <group name={id}><PlantDecoration plant={plant} position={position} pot={pot} /></group>
}

function isDestructible(plant: PottedPlantKind): plant is typeof destructibleKinds[number] {
  return (destructibleKinds as ReadonlyArray<PottedPlantKind>).includes(plant)
}

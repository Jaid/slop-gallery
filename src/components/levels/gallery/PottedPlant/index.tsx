import type {PotPlacement} from '#src/lib/gallery/plantDecorations/placements.ts'

import {sample} from 'es-toolkit'
import {useState} from 'react'

import DestructiblePlant from '#component/levels/gallery/DestructiblePlant'
import PlantDecoration from '#component/levels/gallery/PlantDecoration'
import {useGallery} from '#src/lib/gallery.ts'
import {pottedPlantKinds} from '#src/lib/gallery/plantDecorations/placements.ts'

export default function PottedPlant({id, pot, position}: PotPlacement) {
  const [plant] = useState(() => sample(pottedPlantKinds))
  const resetEpoch = useGallery(s => s.resetEpoch)
  if (plant === 'snake' || plant === 'calathea' || plant === 'birdOfParadise' || plant === 'peaceLily') {
    return <DestructiblePlant key={resetEpoch} id={id} kind={plant} pot={pot} position={position}/>
  }
  return <group name={id}><PlantDecoration plant={plant} pot={pot} position={position}/></group>
}

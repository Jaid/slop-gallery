import PottedPlant from '#component/levels/gallery/PottedPlant'
import {potPlacements} from '#src/lib/gallery/plantDecorations/placements.ts'

export default function PottedPlants() {
  return <group name="potted-plants">
    {potPlacements.map(placement => <PottedPlant key={placement.id} {...placement}/>)}
  </group>
}

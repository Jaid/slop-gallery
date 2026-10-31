import PottedPlant from '#component/PottedPlant'
import {potPlacements} from '#src/lib/gallery/plantDecorations/placements.ts'

export default function PottedPlants() {
  return <group name='potted-plants'>
    {potPlacements.map(placement => <group key={placement.id} userData={{room: placement.room}}><PottedPlant {...placement} /></group>)}
  </group>
}

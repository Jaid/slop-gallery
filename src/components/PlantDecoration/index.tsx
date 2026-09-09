import type {Vec3} from '#src/lib/gallery.ts'
import type {PlantKind, PotKind} from '#src/lib/gallery/plantDecorations/catalog.ts'

import {potDefinition} from '#src/lib/gallery/plantDecorations/catalog.ts'

import Plant from './Plant.tsx'
import Pot from './Pot.tsx'

export type PlantDecorationProps = {
  plant: PlantKind
  position?: Vec3
  pot: PotKind
  rotation?: number
  solid?: boolean
}

export default function PlantDecoration({plant, pot, position, rotation = 0, solid = true}: PlantDecorationProps) {
  return <group name={`plant-decoration-${pot}-${plant}`} position={position} rotation={[0, rotation, 0]} userData={{
    pot,
    plant,
  }}>
    <Pot kind={pot} solid={solid}/>
    <group position={[0, potDefinition(pot).soilHeight, 0]}><Plant kind={plant}/></group>
  </group>
}

export {Plant, Pot}
export type {PlantKind, PotKind}

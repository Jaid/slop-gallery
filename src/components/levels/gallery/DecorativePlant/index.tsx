import type {PlantKind} from '#src/lib/gallery/plantDecorations/catalog.ts'

import {decorationResources} from '#src/lib/gallery/plantDecorations/DecorationResources.ts'

export default function DecorativePlant({kind}: {kind: PlantKind}) {
  const resources = decorationResources()
  const geometry = resources.plant(kind)
  return <group name={`plant-${kind}`} dispose={null}>
    <mesh name="foliage" geometry={geometry.foliage} material={kind === 'rubber' || kind === 'jade' ? resources.waxyFoliage : resources.foliage} castShadow receiveShadow/>
    <mesh name="stems" geometry={geometry.stems} material={kind === 'fig' || kind === 'jade' ? resources.wood : resources.stems} castShadow receiveShadow/>
  </group>
}

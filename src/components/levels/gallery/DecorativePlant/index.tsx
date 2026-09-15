import type {PlantKind} from '#src/lib/gallery/plantDecorations/catalog.ts'

import decorationResources from '#src/lib/gallery/plantDecorations/DecorationResources.ts'

export default function DecorativePlant({kind}: {kind: PlantKind}) {
  const resources = decorationResources()
  const geometry = resources.plant(kind)
  return <group dispose={null} name={`plant-${kind}`}>
    <mesh castShadow geometry={geometry.foliage} material={kind === 'rubber' || kind === 'jade' ? resources.waxyFoliage : resources.foliage} name='foliage' receiveShadow />
    <mesh castShadow geometry={geometry.stems} material={kind === 'fig' || kind === 'jade' ? resources.wood : resources.stems} name='stems' receiveShadow />
  </group>
}

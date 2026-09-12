import type {DestructibleLeaf} from '#src/lib/gallery/destructiblePlants/base/DestructibleGeometry.ts'
import type PlantAttachment from '#src/lib/physics/PlantAttachment.ts'

import {ConvexHullCollider} from '@react-three/rapier'
import Branch from 'branch-component'

import GrabbableProp, {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import decorationResources from '#src/lib/gallery/plantDecorations/DecorationResources.ts'
import initializeFoliageCollider from '#src/lib/physics/initializeFoliageCollider.ts'
import {leafPhysics} from '#src/lib/physics/plantPhysics.ts'

export default function DestructiblePlantLeaf({id, leaf, attachments, anchorId, foliageMaterial}: {anchorId: string
  attachments: PlantAttachment
  foliageMaterial: 'foliage' | 'waxyFoliage'
  id: string
  leaf: DestructibleLeaf}) {
  const resources = decorationResources()
  return <GrabbableProp id={id} title={leaf.title} position={leaf.position} rotation={leaf.rotation} type="fixed" colliders={false} {...leafPhysics} mass={leaf.mass}
    attachmentBody={() => propObjects.get(anchorId)?.body}
    onAttachmentChange={attached => attachments.setLeafAttached(id, attached)}
    recoverAsDynamic={attachments.recoverLeafAsDynamic}
  >
    <ConvexHullCollider ref={initializeFoliageCollider} args={[leaf.vertices]} mass={leaf.mass}/>
    <mesh name="pluckable-blade" geometry={leaf.geometry} material={resources[foliageMaterial]} castShadow receiveShadow/>
    <Branch all={[leaf.stem, leaf.stemVertices]}>
      <ConvexHullCollider ref={initializeFoliageCollider} args={[leaf.stemVertices!]} mass={leaf.stemMass}/>
      <mesh name="carried-stalk" geometry={leaf.stem!} material={resources.stems} castShadow receiveShadow/>
    </Branch>
  </GrabbableProp>
}


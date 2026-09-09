import type {DestructiblePlantKind} from '#src/lib/gallery/destructiblePlants/catalog.ts'
import type {DestructibleCatalogKind} from '#src/lib/gallery/destructiblePlants/CatalogPlantGeometry.ts'
import type {PotKind} from '#src/lib/gallery/plantDecorations/catalog.ts'
import type {Vec3} from '#src/lib/gallery/types.ts'

import {ConvexHullCollider, CylinderCollider} from '@react-three/rapier'
import {useMemo} from 'react'

import Pot from '#src/components/PlantDecoration/Pot.tsx'
import GrabbableProp from '#src/components/Scene/GrabbableProp.tsx'
import {potDefinition} from '#src/lib/gallery/plantDecorations/catalog.ts'
import {decorationResources} from '#src/lib/gallery/plantDecorations/DecorationResources.ts'
import {initializeFoliageCollider} from '#src/lib/physics/initializeFoliageCollider.ts'
import {PlantAttachment} from '#src/lib/physics/PlantAttachment.ts'
import {potPhysics} from '#src/lib/physics/pots.ts'
import {RootedPlantAttachment} from '#src/lib/physics/RootedPlantAttachment.ts'

import Leaf from './Leaf.tsx'
import Root from './Root.tsx'

export type DestructiblePlantProps = {
  id: string
  kind: DestructibleCatalogKind | DestructiblePlantKind
  position: Vec3
  pot: PotKind
  rotation?: number
}

export default function DestructiblePlant({id, kind, pot, position, rotation = 0}: DestructiblePlantProps) {
  const resources = decorationResources()
  const geometry = resources.destructiblePlant(kind)
  const vessel = resources.pot(pot)
  const definition = potDefinition(pot)
  const center = definition.height / 2
  const Attachment = geometry.removableRoot ? RootedPlantAttachment : PlantAttachment
  const attachments = useMemo(() => {
    return new Attachment(geometry.leaves.map(leaf => `${id}-${leaf.id}`))
  }, [Attachment, geometry, id])
  const rooted = attachments instanceof RootedPlantAttachment
  return <group name={id} position={position} rotation={[0, rotation, 0]} dispose={null} userData={{
    plant: kind,
    pot,
    destructible: true,
  }}>
    <GrabbableProp id={`${id}-pot`} title="A pot with nothing left to lose" position={[0, center, 0]} type="fixed" colliders={false} {...potPhysics}
      canGrab={attachments.canGrabPot}
      blockedMessage={() => {
        return rooted ? 'Remove all leaves, then uproot the plant before picking up this pot.' : `Pluck all foliage before picking up this pot (${attachments.remaining} remaining).`
      }}
      onAttachmentChange={attachments.setPotAttached}
    >
      <group position={[0, -center, 0]}>
        <Pot kind={pot} solid={false}/>
        <ConvexHullCollider args={[vessel.vertices]} mass={3.8}/>
        <CylinderCollider args={[0.015, definition.soilRadius]} position={[0, definition.soilHeight - 0.015, 0]} mass={0.8}/>
        {pot === 'noir' && <CylinderCollider args={[0.065, 0.24]} position={[0, 0.065, 0]} mass={0.3}/>}
        {!rooted && <group position={[0, definition.soilHeight, 0]}>
          <mesh name="remaining-stems" geometry={geometry.stems} material={resources[geometry.stemMaterial]} castShadow receiveShadow/>
          {geometry.stemColliders.map((collider, i) => <ConvexHullCollider key={i} ref={initializeFoliageCollider} args={[collider.vertices]} mass={collider.mass}/>)}
        </group>}
      </group>
    </GrabbableProp>
    {/* Loose leaves remain siblings of the pot, so moving it never drags them along. */}
    <group position={[0, definition.soilHeight, 0]}>
      {rooted && <Root id={id} geometry={geometry} attachments={attachments}/>}
      {geometry.leaves.map(leaf => <Leaf anchorId={`${id}-pot`} foliageMaterial={geometry.foliageMaterial} key={leaf.id} id={`${id}-${leaf.id}`} leaf={leaf} attachments={attachments}/>)}
    </group>
  </group>
}

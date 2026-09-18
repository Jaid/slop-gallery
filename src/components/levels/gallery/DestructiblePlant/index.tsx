import type {DestructiblePlantKind} from '#src/lib/gallery/destructiblePlants/catalog.ts'
import type {DestructibleCatalogKind} from '#src/lib/gallery/destructiblePlants/CatalogPlantGeometry.ts'
import type {PotKind} from '#src/lib/gallery/plantDecorations/catalog.ts'
import type {Vec3} from '#src/lib/gallery/types.ts'

import {ConvexHullCollider, CylinderCollider} from '@react-three/rapier'
import Branch from 'branch-component'
import {useMemo} from 'react'

import Pot from '#component/levels/gallery/DecorativePot'
import Leaf from '#component/levels/gallery/DestructiblePlantLeaf'
import Root from '#component/levels/gallery/DestructiblePlantRoot'
import GrabbableProp from '#src/components/Scene/GrabbableProp.tsx'
import {potDefinition} from '#src/lib/gallery/plantDecorations/catalog.ts'
import decorationResources from '#src/lib/gallery/plantDecorations/DecorationResources.ts'
import initializeFoliageCollider from '#src/lib/physics/initializeFoliageCollider.ts'
import PlantAttachment from '#src/lib/physics/PlantAttachment.ts'
import {potPhysics} from '#src/lib/physics/plantPhysics.ts'
import RootedPlantAttachment from '#src/lib/physics/RootedPlantAttachment.ts'

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
  return <group
    dispose={null} name={id} position={position} rotation={[0, rotation, 0]} userData={{
      plant: kind,
      pot,
      destructible: true,
    }}
  >
    <GrabbableProp
      id={`${id}-pot`} colliders={false} position={[0, center, 0]} title='A pot with nothing left to lose' type='fixed' {...potPhysics}
      blockedMessage={() => {
        return rooted ? 'Remove all leaves, then uproot the plant before picking up this pot.' : `Pluck all foliage before picking up this pot (${attachments.remaining} remaining).`
      }}
      canGrab={attachments.canGrabPot}
      onAttachmentChange={attachments.setPotAttached}
    >
      <group position={[0, -center, 0]}>
        <Pot kind={pot} solid={false} />
        <ConvexHullCollider args={[vessel.vertices]} mass={3.8} />
        <CylinderCollider args={[0.015, definition.soilRadius]} mass={0.8} position={[0, definition.soilHeight - 0.015, 0]} />
        <Branch if={pot === 'noir'}><CylinderCollider args={[0.065, 0.24]} mass={0.3} position={[0, 0.065, 0]} /></Branch>
        <Branch not={rooted}><group position={[0, definition.soilHeight, 0]}>
          <mesh castShadow geometry={geometry.stems} material={resources[geometry.stemMaterial]} name='remaining-stems' receiveShadow />
          {geometry.stemColliders.map((collider, i) => <ConvexHullCollider key={i} args={[collider.vertices]} mass={collider.mass} ref={initializeFoliageCollider} />)}
        </group></Branch>
      </group>
    </GrabbableProp>
    {/* Loose leaves remain siblings of the pot, so moving it never drags them along. */}
    <group position={[0, definition.soilHeight, 0]}>
      <Branch if={rooted}><Root id={id} attachments={attachments as RootedPlantAttachment} geometry={geometry} /></Branch>
      {geometry.leaves.map(leaf => <Leaf key={leaf.id} id={`${id}-${leaf.id}`} anchorId={`${id}-pot`} attachments={attachments} foliageMaterial={geometry.foliageMaterial} leaf={leaf} />)}
    </group>
  </group>
}

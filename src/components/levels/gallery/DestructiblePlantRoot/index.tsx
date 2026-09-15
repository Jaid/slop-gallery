import type DestructibleGeometry from '#src/lib/gallery/destructiblePlants/base/DestructibleGeometry.ts'
import type RootedPlantAttachment from '#src/lib/physics/RootedPlantAttachment.ts'

import {ConvexHullCollider} from '@react-three/rapier'
import {Vector3} from 'three/webgpu'

import GrabbableProp, {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import decorationResources from '#src/lib/gallery/plantDecorations/DecorationResources.ts'
import initializeFoliageCollider from '#src/lib/physics/initializeFoliageCollider.ts'

export default function DestructiblePlantRoot({id, geometry, attachments}: {
  attachments: RootedPlantAttachment
  geometry: DestructibleGeometry
  id: string
}) {
  const resources = decorationResources()
  const center = geometry.stems.boundingBox!.getCenter(new Vector3)
  return <GrabbableProp
    angularDamping={0.4} attachmentBody={() => propObjects.get(`${id}-pot`)?.body} blockedMessage={() => `Rip off all leaves before uprooting this plant (${attachments.remaining} remaining).`} canGrab={attachments.canGrabRoot} colliders={false}
    friction={0.8}
    id={`${id}-root`}
    linearDamping={0.3}
    onAttachmentChange={attachments.setRootAttached}
    position={center.toArray()}
    recoverAsDynamic={attachments.recoverRootAsDynamic} restitution={0.15} title='The plant’s root and stalks' type='fixed'
  >
    <group position={[-center.x, -center.y, -center.z]}>
      <mesh castShadow geometry={geometry.stems} material={resources[geometry.stemMaterial]} name='uprootable-trunk' receiveShadow />
      {geometry.stemColliders.map((collider, i) => <ConvexHullCollider args={[collider.vertices]} key={i} mass={collider.mass} ref={initializeFoliageCollider} />)}
    </group>
  </GrabbableProp>
}

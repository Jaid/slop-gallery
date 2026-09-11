import type DestructibleGeometry from '#src/lib/gallery/destructiblePlants/base/DestructibleGeometry.ts'
import type RootedPlantAttachment from '#src/lib/physics/RootedPlantAttachment.ts'

import {ConvexHullCollider} from '@react-three/rapier'
import {useMemo} from 'react'
import {Vector3} from 'three/webgpu'

import GrabbableProp, {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import decorationResources from '#src/lib/gallery/plantDecorations/DecorationResources.ts'
import initializeFoliageCollider from '#src/lib/physics/initializeFoliageCollider.ts'

export default function DestructiblePlantRoot({id, geometry, attachments}: {attachments: RootedPlantAttachment
  geometry: DestructibleGeometry
  id: string}) {
  const resources = decorationResources()
  const center = useMemo(() => geometry.stems.boundingBox!.getCenter(new Vector3), [geometry])
  return <GrabbableProp id={`${id}-root`} title="The plant’s root and stalks" position={center.toArray()} type="fixed" colliders={false}
    canGrab={attachments.canGrabRoot}
    blockedMessage={() => `Rip off all leaves before uprooting this plant (${attachments.remaining} remaining).`}
    onAttachmentChange={attachments.setRootAttached}
    recoverAsDynamic={attachments.recoverRootAsDynamic}
    attachmentBody={() => propObjects.get(`${id}-pot`)?.body}
    linearDamping={0.3} angularDamping={0.4} restitution={0.15} friction={0.8}
  >
    <group position={[-center.x, -center.y, -center.z]}>
      <mesh name="uprootable-trunk" geometry={geometry.stems} material={resources[geometry.stemMaterial]} castShadow receiveShadow/>
      {geometry.stemColliders.map((collider, i) => <ConvexHullCollider key={i} ref={initializeFoliageCollider} args={[collider.vertices]} mass={collider.mass}/>)}
    </group>
  </GrabbableProp>
}

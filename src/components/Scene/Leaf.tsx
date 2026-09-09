import type {RapierCollider} from '@react-three/rapier'
import type {Vec3} from '#src/lib/gallery.ts'
import type {GrabbableBodyOptions} from '#src/lib/physics/GrabbableBody.ts'
import type {LeafStem} from '#src/lib/physics/leaves.ts'

import {ConvexHullCollider} from '@react-three/rapier'

import {leafGeometry, leafPhysics, leafRotation, leafVertices} from '#src/lib/physics/leaves.ts'

import GrabbableProp from './GrabbableProp.tsx'

// Stable ref: disable only on creation, never again after the leaf is released.
const attachLeafCollider = (collider: RapierCollider | null) => {collider?.setEnabled(false)}

export default function Leaf({id, position, color, stem, onAttachmentChange, recoverAsDynamic}: {id: string; position: Vec3; color: string; stem: LeafStem} & Pick<GrabbableBodyOptions, 'onAttachmentChange' | 'recoverAsDynamic'>) {
  return <GrabbableProp id={id} title="A leaf with somewhere else to be" position={position} rotation={leafRotation} type="fixed" colliders={false} {...leafPhysics} onAttachmentChange={onAttachmentChange} recoverAsDynamic={recoverAsDynamic}>
    {/* Attached foliage is decorative; only a plucked leaf becomes a solid dynamic prop. */}
    <ConvexHullCollider ref={attachLeafCollider} args={[leafVertices]} mass={leafPhysics.mass}/>
    <mesh castShadow receiveShadow><primitive attach="geometry" object={leafGeometry}/><meshStandardNodeMaterial color={color} roughness={0.64}/></mesh>
    {stem.carriedGeometry && stem.vertices && <>
      <ConvexHullCollider ref={attachLeafCollider} args={[stem.vertices]} mass={stem.mass}/>
      <mesh castShadow receiveShadow><primitive attach="geometry" object={stem.carriedGeometry}/><meshStandardNodeMaterial color="#4d603d"/></mesh>
    </>}
  </GrabbableProp>
}

import type {RapierCollider} from '@react-three/rapier'
import type {Vec3} from '#src/lib/gallery.ts'

import {ConvexHullCollider, CylinderCollider} from '@react-three/rapier'
import {useMemo} from 'react'

import {plantLeaves} from '#src/lib/physics/leaves.ts'
import {PlantAttachment} from '#src/lib/physics/PlantAttachment.ts'
import {potGeometry, potPhysics, potVertices, soilSurface} from '#src/lib/physics/pots.ts'

import GrabbableProp from './GrabbableProp.tsx'
import Leaf from './Leaf.tsx'
import SoilMaterial from './SoilMaterial.tsx'
import TerracottaMaterial from './TerracottaMaterial.tsx'

// Attached stems remain decorative. Once the pot is released they collide with it.
const attachStemCollider = (collider: RapierCollider | null) => {collider?.setEnabled(false)}

export default function Plant({position}: {position: Vec3}) {
  const leaves = useMemo(() => plantLeaves(position), [position[0], position[1], position[2]])
  const attachments = useMemo(() => new PlantAttachment(leaves.map(leaf => leaf.id)), [leaves])
  return <group position={position}>
    <GrabbableProp
      id={'prop-pot-' + position.join(':')}
      title="A pot with nothing left to lose"
      position={[0, 0.36, 0]}
      type="fixed"
      colliders={false}
      {...potPhysics}
      canGrab={attachments.canGrabPot}
      blockedMessage={() => 'Pluck the remaining ' + attachments.remaining + (attachments.remaining === 1 ? ' leaf' : ' leaves') + ' before picking up this pot.'}
      onAttachmentChange={attachments.setPotAttached}
    >
      <group position={[0, -0.36, 0]}>
        <ConvexHullCollider args={[potVertices]} mass={3.8}/>
        <CylinderCollider args={[soilSurface.halfHeight, soilSurface.radius]} position={[0, soilSurface.center, 0]} mass={0.8}/>
        <mesh castShadow receiveShadow><primitive attach="geometry" object={potGeometry}/><TerracottaMaterial/></mesh>
        <mesh position={[0, soilSurface.center, 0]} receiveShadow><cylinderGeometry args={[soilSurface.radius, soilSurface.radius, soilSurface.halfHeight * 2, 64]}/><SoilMaterial/></mesh>
        {leaves.map(leaf => <group key={leaf.id} rotation={[0, leaf.angle, 0]}>
          <mesh castShadow><primitive attach="geometry" object={leaf.stem.rootGeometry}/><meshStandardNodeMaterial color="#4d603d"/></mesh>
          <ConvexHullCollider ref={attachStemCollider} args={[leaf.stem.remainingVertices]} mass={0.003}/>
          <mesh castShadow><primitive attach="geometry" object={leaf.stem.remainingGeometry}/><meshStandardNodeMaterial color="#4d603d"/></mesh>
        </group>)}
      </group>
    </GrabbableProp>
    {/* Leaves are independent world bodies, never children of the movable pot. */}
    {leaves.map(leaf => <group key={leaf.id} rotation={[0, leaf.angle, 0]}>
      <Leaf id={leaf.id} position={leaf.position} color={leaf.color} stem={leaf.stem}
        onAttachmentChange={attached => attachments.setLeafAttached(leaf.id, attached)}
        recoverAsDynamic={attachments.recoverLeafAsDynamic}
      />
    </group>)}
  </group>
}

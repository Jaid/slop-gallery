import type {Material} from 'three/webgpu'

import {RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import MeshSurfaceCollider from '#component/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {bastionCrater} from '#src/lib/gallery/bastion.ts'
import BastionCraterGeometry from '#src/lib/gallery/BastionCraterGeometry.ts'
import CraterMaterial from '#src/lib/materials/CraterMaterial.ts'
import {lightIndoors} from '#src/lib/materials/lights/index.ts'

/** The crater in the Bastion’s landing in front of the connecting tunnel’s doorway: its flags tipped in, dressed in the passages’ `stone`, and the rubble and shards under them, in the crater’s own frame. */
export default function BastionCrater({stone}: {stone: Material}) {
  const geometry = useDisposable(useMemo(() => new BastionCraterGeometry, []))
  const collision = [geometry.flags, geometry.rubble, geometry.shards].map(colliderGeometry)
  // Dust and grit under the paving, and dark, cracked shards in it, like the Moonfall crater’s.
  const rubble = useDisposable(useMemo(() => lightIndoors(new CraterMaterial), []))
  const rock = useDisposable(useMemo(() => lightIndoors(new CraterMaterial({rock: true})), []))
  return <RigidBody colliders={false} name='bastion-crater' position={bastionCrater.center} type='fixed'>
    {collision.map((args, i) => <MeshSurfaceCollider key={i} args={args} />)}
    <mesh castShadow geometry={geometry.flags} material={stone} name='bastion-crater-flags' receiveShadow />
    <mesh castShadow geometry={geometry.rubble} material={rubble} name='bastion-crater-rubble' receiveShadow />
    <mesh castShadow geometry={geometry.shards} material={rock} name='bastion-crater-shards' receiveShadow />
  </RigidBody>
}

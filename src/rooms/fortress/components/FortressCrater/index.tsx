import type {Material} from 'three/webgpu'

import {RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import MeshSurfaceCollider from '#component/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {fortressCrater} from '#src/lib/gallery/fortress.ts'
import FortressCraterGeometry from '#src/lib/gallery/FortressCraterGeometry.ts'
import CraterMaterial from '#src/lib/materials/CraterMaterial.ts'
import {lightIndoors} from '#src/lib/materials/lights/index.ts'

/** The crater in the Fortress’ landing in front of the connecting tunnel’s doorway: its flags tipped in, dressed in the passages’ `stone`, and the rubble and shards under them, in the crater’s own frame. */
export default function FortressCrater({stone}: {stone: Material}) {
  const geometry = useDisposable(useMemo(() => new FortressCraterGeometry, []))
  const collision = [geometry.flags, geometry.rubble, geometry.shards].map(colliderGeometry)
  // Dust and grit under the paving, and dark, cracked shards in it, like the Moonfall crater’s.
  const rubble = useDisposable(useMemo(() => lightIndoors(new CraterMaterial), []))
  const rock = useDisposable(useMemo(() => lightIndoors(new CraterMaterial({rock: true})), []))
  return <RigidBody colliders={false} name='fortress-crater' position={fortressCrater.center} type='fixed'>
    {collision.map((args, i) => <MeshSurfaceCollider key={i} args={args} />)}
    <mesh castShadow geometry={geometry.flags} material={stone} name='fortress-crater-flags' receiveShadow />
    <mesh castShadow geometry={geometry.rubble} material={rubble} name='fortress-crater-rubble' receiveShadow />
    <mesh castShadow geometry={geometry.shards} material={rock} name='fortress-crater-shards' receiveShadow />
  </RigidBody>
}

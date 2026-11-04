import type {Material} from 'three/webgpu'

import {ConvexHullCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {Shape, Vector2} from 'three/webgpu'

import MeshSurfaceCollider from '#component/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {fortressCrater, fortressGuardStone} from '#src/lib/gallery/fortress.ts'
import FortressCraterGeometry, {guardStoneHull} from '#src/lib/gallery/FortressCraterGeometry.ts'
import CraterMaterial from '#src/lib/materials/CraterMaterial.ts'
import {lightIndoors} from '#src/lib/materials/lights/index.ts'

const {bottom, corners, top} = fortressGuardStone
/** how far the guard stone’s arrises are chamfered, inside its outline, which collides */
const chamfer = 0.02
// Drawn with its y turned to −z, it is extruded upward once the mesh lies down.
const guardStoneShape = new Shape(corners.map(([x, z]) => new Vector2(x, -z)))
const hull = guardStoneHull()

/** The little crater in the Fortress’ landing, its tipped flags, rubble and shards in the crater’s own frame, and the guard stone in the connecting tunnel’s doorway that turns whatever rolls down the tunnel toward it, dressed in the passages’ `stone`. */
export default function FortressCrater({stone}: {stone: Material}) {
  const geometry = useDisposable(useMemo(() => new FortressCraterGeometry, []))
  const collision = [geometry.flags, geometry.rubble, geometry.shards].map(colliderGeometry)
  // Dust and grit under the paving, and dark, cracked shards in it, like the Moonfall crater’s.
  const rubble = useDisposable(useMemo(() => lightIndoors(new CraterMaterial), []))
  const rock = useDisposable(useMemo(() => lightIndoors(new CraterMaterial({rock: true})), []))
  return <group name='fortress-crater'>
    <RigidBody colliders={false} position={fortressCrater.center} type='fixed'>
      {collision.map((args, i) => <MeshSurfaceCollider key={i} args={args} />)}
      <mesh castShadow geometry={geometry.flags} material={stone} name='fortress-crater-flags' receiveShadow />
      <mesh castShadow geometry={geometry.rubble} material={rubble} name='fortress-crater-rubble' receiveShadow />
      <mesh castShadow geometry={geometry.shards} material={rock} name='fortress-crater-shards' receiveShadow />
    </RigidBody>
    <RigidBody colliders={false} type='fixed'>
      <ConvexHullCollider args={[hull]} />
      <mesh castShadow material={stone} name='fortress-guard-stone' position={[0, bottom + chamfer, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}><extrudeGeometry
        args={[guardStoneShape, {
          depth: top - bottom - chamfer * 2,
          bevelEnabled: true,
          bevelThickness: chamfer,
          bevelSize: chamfer,
          bevelOffset: -chamfer,
          bevelSegments: 1,
        }]}
      /></mesh>
    </RigidBody>
  </group>
}

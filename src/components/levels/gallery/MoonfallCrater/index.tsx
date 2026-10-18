import type {Texture} from 'three/webgpu'

import {RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {moonfallCrater} from '#src/lib/gallery/moonfall/config.ts'
import CraterGeometry from '#src/lib/gallery/moonfall/CraterGeometry.ts'
import StanchionRingGeometry from '#src/lib/gallery/railings/StanchionRingGeometry.ts'
import CraterMaterial from '#src/lib/materials/CraterMaterial.ts'
import gold from '#src/lib/materials/gold.ts'
import VelvetRopeMaterial from '#src/lib/materials/VelvetRopeMaterial.ts'

export default function MoonfallCrater({stone}: {stone: Texture}) {
  const geometry = useDisposable(useMemo(() => new CraterGeometry, []))
  const fence = useDisposable(useMemo(() => new StanchionRingGeometry(moonfallCrater.fenceRadius, moonfallCrater.fencePosts), []))
  const collision = [geometry.floor, geometry.terrain, geometry.rocks, fence.postCollision, fence.rope].map(colliderGeometry)
  const rock = useDisposable(useMemo(() => new CraterMaterial(false), []))
  const terrain = useDisposable(useMemo(() => new CraterMaterial, []))
  const velvet = useDisposable(useMemo(() => new VelvetRopeMaterial, []))
  return <group name='moonfall-impact-crater'>
    <RigidBody colliders={false} type='fixed'>
      {collision.map((args, i) => <MeshSurfaceCollider key={i} args={args} />)}
      <mesh castShadow geometry={geometry.floor} name='moonfall-slate-floor' receiveShadow>
        <meshStandardNodeMaterial color='#24373d' envMapIntensity={0.08} map={stone} roughness={0.9} />
      </mesh>
      <mesh castShadow geometry={geometry.terrain} material={terrain} name='moonfall-crater-terrain' receiveShadow />
      <mesh castShadow geometry={geometry.rocks} material={rock} name='moonfall-impact-ejecta' receiveShadow />
      <mesh castShadow geometry={fence.posts} material={gold} name='moonfall-crater-stanchions' receiveShadow />
      <mesh castShadow geometry={fence.rope} material={velvet} name='moonfall-crater-rope' receiveShadow />
    </RigidBody>
    <mesh material={gold} name='moonfall-crater-trim' position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[moonfallCrater.radius, moonfallCrater.radius + 0.055, moonfallCrater.rimSegments]} />
    </mesh>
  </group>
}

import type {Texture} from 'three/webgpu'

import {RigidBody} from '@react-three/rapier'
import {useEffect} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {moonfallCrater} from '#src/lib/gallery/moonfall/config.ts'
import CraterGeometry from '#src/lib/gallery/moonfall/CraterGeometry.ts'
import StanchionRingGeometry from '#src/lib/gallery/railings/StanchionRingGeometry.ts'
import CraterMaterial from '#src/lib/materials/CraterMaterial.ts'

export default function MoonfallCrater({stone}: {stone: Texture}) {
  const geometry = new CraterGeometry
  const fence = new StanchionRingGeometry(moonfallCrater.fenceRadius, moonfallCrater.fencePosts)
  const collision = [geometry.floor, geometry.terrain, geometry.rocks, fence.posts, fence.rope].map(colliderGeometry)
  const rock = new CraterMaterial(false)
  const terrain = new CraterMaterial
  const bronze = new MeshStandardNodeMaterial({
    color: '#ad9470',
    metalness: 0.78,
    roughness: 0.32,
  })
  useEffect(() => () => {
    geometry.dispose()
    fence.dispose()
    rock.dispose()
    terrain.dispose()
    bronze.dispose()
  }, [geometry, fence, rock, terrain, bronze])
  return <group name='moonfall-impact-crater'>
    <RigidBody colliders={false} type='fixed'>
      {collision.map((args, i) => <MeshSurfaceCollider key={i} args={args} />)}
      <mesh castShadow geometry={geometry.floor} name='moonfall-slate-floor' receiveShadow>
        <meshStandardNodeMaterial color='#24373d' envMapIntensity={0.08} map={stone} roughness={0.9} />
      </mesh>
      <mesh castShadow geometry={geometry.terrain} material={terrain} name='moonfall-crater-terrain' receiveShadow />
      <mesh castShadow geometry={geometry.rocks} material={rock} name='moonfall-impact-ejecta' receiveShadow />
      <mesh castShadow geometry={fence.posts} material={bronze} name='moonfall-crater-stanchions' receiveShadow />
      <mesh castShadow geometry={fence.rope} name='moonfall-crater-rope' receiveShadow>
        <meshStandardNodeMaterial color='#293f40' envMapIntensity={0.1} roughness={0.96} />
      </mesh>
    </RigidBody>
    <mesh material={bronze} position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[moonfallCrater.radius, moonfallCrater.radius + 0.055, moonfallCrater.angularSegments]} />
    </mesh>
  </group>
}

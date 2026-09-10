import type {Texture} from 'three/webgpu'

import {RigidBody} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {StanchionRingGeometry} from '#src/lib/gallery/railings/StanchionRingGeometry.ts'
import {undertoneCrater} from '#src/lib/gallery/undertone/config.ts'
import {CraterGeometry} from '#src/lib/gallery/undertone/CraterGeometry.ts'
import {CraterMaterial} from '#src/lib/materials/CraterMaterial.ts'

import MeshSurfaceCollider from './MeshSurfaceCollider.tsx'

export default function UndertoneCrater({stone}: {stone: Texture}) {
  const geometry = useMemo(() => new CraterGeometry, [])
  const fence = useMemo(() => new StanchionRingGeometry(undertoneCrater.fenceRadius, undertoneCrater.fencePosts), [])
  const collision = useMemo(() => [geometry.floor, geometry.terrain, geometry.rocks, fence.posts, fence.rope].map(colliderGeometry), [geometry, fence])
  const rock = useMemo(() => new CraterMaterial(false), [])
  const terrain = useMemo(() => new CraterMaterial, [])
  const bronze = useMemo(() => new MeshStandardNodeMaterial({
    color: '#ad9470',
    metalness: 0.78,
    roughness: 0.32,
  }), [])
  useEffect(() => () => {
    geometry.dispose()
    fence.dispose()
    rock.dispose()
    terrain.dispose()
    bronze.dispose()
  }, [geometry, fence, rock, terrain, bronze])
  return <group name="undertone-impact-crater">
    <RigidBody type="fixed" colliders={false}>
      {collision.map((args, i) => <MeshSurfaceCollider key={i} args={args}/>)}
      <mesh name="undertone-slate-floor" geometry={geometry.floor} receiveShadow castShadow>
        <meshStandardNodeMaterial color="#24373d" map={stone} roughness={0.9} envMapIntensity={0.08}/>
      </mesh>
      <mesh name="undertone-crater-terrain" geometry={geometry.terrain} material={terrain} receiveShadow castShadow/>
      <mesh name="undertone-impact-ejecta" geometry={geometry.rocks} material={rock} receiveShadow castShadow/>
      <mesh name="undertone-crater-stanchions" geometry={fence.posts} material={bronze} receiveShadow castShadow/>
      <mesh name="undertone-crater-rope" geometry={fence.rope} receiveShadow castShadow>
        <meshStandardNodeMaterial color="#293f40" roughness={0.96} envMapIntensity={0.1}/>
      </mesh>
    </RigidBody>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} material={bronze}>
      <ringGeometry args={[undertoneCrater.radius, undertoneCrater.radius + 0.055, undertoneCrater.angularSegments]}/>
    </mesh>
  </group>
}

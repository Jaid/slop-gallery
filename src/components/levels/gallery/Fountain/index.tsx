import {RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'
import useGraphicsMode from 'use-graphics-mode'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import fountain from '#src/lib/gallery/fountain/config.ts'
import FountainGeometry from '#src/lib/gallery/fountain/FountainGeometry.ts'
import FountainSpray from '#src/lib/gallery/fountain/FountainSpray.ts'
import FountainStoneMaterial from '#src/lib/materials/FountainStoneMaterial.ts'
import FountainWaterMaterial from '#src/lib/materials/FountainWaterMaterial.ts'

export default function Fountain() {
  const isHeavy = useGraphicsMode()
  const geometry = useDisposable(useMemo(() => new FountainGeometry, []))
  const collision = colliderGeometry(geometry.stone)
  const stone = useDisposable(useMemo(() => new FountainStoneMaterial, []))
  const brass = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#ba9650',
    roughness: 0.27,
    metalness: 0.85,
  }), []))
  const spray = useDisposable(useMemo(() => new FountainSpray, []))
  const pool = useDisposable(useMemo(() => new FountainWaterMaterial(false, isHeavy), [isHeavy]))
  const falling = useDisposable(useMemo(() => new FountainWaterMaterial(true, isHeavy), [isHeavy]))
  return <group name='lobby-fountain' position={fountain.position}>
    <RigidBody colliders={false} type='fixed'>
      <MeshSurfaceCollider args={collision} />
      <mesh castShadow geometry={geometry.stone} material={stone} name='fountain-carved-stone' receiveShadow />
      <mesh castShadow geometry={geometry.brass} material={brass} name='fountain-brass-nozzle' receiveShadow />
    </RigidBody>
    <mesh geometry={geometry.pools} material={pool} name='fountain-pools' receiveShadow />
    <mesh geometry={geometry.water} material={falling} name='fountain-falling-water' />
    <primitive object={spray} />
  </group>
}

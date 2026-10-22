import {RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import useGraphicsMode from 'use-graphics-mode'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import Orbitable from '#component/Orbitable'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import fountain from '#src/lib/gallery/fountain/config.ts'
import FountainGeometry from '#src/lib/gallery/fountain/FountainGeometry.ts'
import FountainSpray from '#src/lib/gallery/fountain/FountainSpray.ts'
import BronzeMaterial from '#src/lib/materials/BronzeMaterial.ts'
import FountainBasinMaterial from '#src/lib/materials/FountainBasinMaterial.ts'
import FountainStoneMaterial from '#src/lib/materials/FountainStoneMaterial.ts'
import FountainWaterMaterial, {fountainWaterEnvironment} from '#src/lib/materials/FountainWaterMaterial.ts'

export default function Fountain() {
  const isHeavy = useGraphicsMode()
  const geometry = useDisposable(useMemo(() => new FountainGeometry, []))
  const collision = useMemo(() => colliderGeometry(geometry.stone), [geometry])
  const stone = useDisposable(useMemo(() => new FountainStoneMaterial, []))
  const brass = useDisposable(useMemo(() => {
    const material = new BronzeMaterial
    material.envMap = fountainWaterEnvironment
    material.envMapIntensity = 0.5
    return material
  }, []))
  const lining = useDisposable(useMemo(() => new FountainBasinMaterial, []))
  const spray = useDisposable(useMemo(() => new FountainSpray, []))
  const pool = useDisposable(useMemo(() => new FountainWaterMaterial(false, isHeavy), [isHeavy]))
  const falling = useDisposable(useMemo(() => new FountainWaterMaterial(true, isHeavy), [isHeavy]))
  // Framed around the jet’s crown and the plinth’s reach, circling at a bench’s distance at most.
  return <Orbitable
    id='lobby-fountain' center={[0, 1.65, 0]} dispose={null} name='lobby-fountain' orbit={{
      radius: 2.7,
      minDistance: 3.5,
      maxDistance: 8,
      floorY: fountain.position[1],
    }} position={fountain.position} title='Fountain'
  >
    <RigidBody colliders={false} type='fixed'>
      <MeshSurfaceCollider args={collision} />
      <mesh castShadow geometry={geometry.stone} material={stone} name='fountain-carved-stone' receiveShadow />
      <mesh castShadow geometry={geometry.brass} material={brass} name='fountain-bronze-inlay' receiveShadow />
    </RigidBody>
    <mesh geometry={geometry.lining} material={lining} name='fountain-jade-mosaic' receiveShadow />
    <mesh geometry={geometry.pools} material={pool} name='fountain-pools' receiveShadow />
    <mesh geometry={geometry.water} material={falling} name='fountain-falling-water' />
    <primitive object={spray} />
  </Orbitable>
}

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
import FountainStoneMaterial from '#src/lib/materials/FountainStoneMaterial.ts'
import gold from '#src/lib/materials/gold.ts'
import {FallingWaterMaterial, PoolWaterMaterial} from '#src/lib/materials/water/index.ts'

export default function Fountain() {
  const isHeavy = useGraphicsMode()
  const geometry = useDisposable(useMemo(() => new FountainGeometry, []))
  const collision = useMemo(() => colliderGeometry(geometry.stone), [geometry])
  const stone = useDisposable(useMemo(() => new FountainStoneMaterial, []))
  const spray = useDisposable(useMemo(() => new FountainSpray, []))
  const pool = useDisposable(useMemo(() => new PoolWaterMaterial(isHeavy), [isHeavy]))
  const falling = useDisposable(useMemo(() => new FallingWaterMaterial(isHeavy), [isHeavy]))
  // Framed around the tazza and the crown jet, circling at a bench’s distance at most.
  return <Orbitable
    id='lobby-fountain' center={[0, 1.7, 0]} name='lobby-fountain' orbit={{
      radius: 2.8,
      minDistance: 3.4,
      maxDistance: 8,
      floorY: fountain.position[1],
    }} position={fountain.position} title='Fountain'
  >
    <RigidBody colliders={false} type='fixed'>
      <MeshSurfaceCollider args={collision} />
      <mesh castShadow geometry={geometry.stone} material={stone} name='fountain-carved-stone' receiveShadow />
      {/* The shared gold lives as long as the page; it is borrowed, never disposed. */}
      <mesh castShadow geometry={geometry.gilt} material={gold} name='fountain-gilt-nozzles' receiveShadow />
    </RigidBody>
    <mesh geometry={geometry.pools} material={pool} name='fountain-pools' receiveShadow />
    <mesh geometry={geometry.water} material={falling} name='fountain-falling-water' renderOrder={1} />
    <primitive object={spray} />
  </Orbitable>
}

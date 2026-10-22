import {RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'
import useGraphicsMode from 'use-graphics-mode'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import Orbitable from '#component/Orbitable'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import fountain from '#src/lib/gallery/fountain/config.ts'
import FountainGeometry from '#src/lib/gallery/fountain/FountainGeometry.ts'
import FountainMist from '#src/lib/gallery/fountain/FountainMist.ts'
import FountainSpray from '#src/lib/gallery/fountain/FountainSpray.ts'
import FountainStoneMaterial from '#src/lib/materials/FountainStoneMaterial.ts'
import FountainWaterMaterial from '#src/lib/materials/FountainWaterMaterial.ts'
import waterEnvironment from '#src/lib/materials/water.ts'

/** A water-gilt bronze like the vault’s ornament: polished enough to catch the room’s light, with enough body not to mirror the dark water. */
const giltBronze = {
  color: '#d3a554',
  metalness: 0.62,
  roughness: 0.28,
} as const

export default function Fountain() {
  const isHeavy = useGraphicsMode()
  const geometry = useDisposable(useMemo(() => new FountainGeometry, []))
  const collision = colliderGeometry(geometry.stone)
  const stone = useDisposable(useMemo(() => new FountainStoneMaterial, []))
  const gilt = useDisposable(useMemo(() => new MeshStandardNodeMaterial(giltBronze), []))
  const spray = useDisposable(useMemo(() => new FountainSpray, []))
  const mist = useDisposable(useMemo(() => new FountainMist, []))
  const pool = useDisposable(useMemo(() => new FountainWaterMaterial(false, isHeavy, {environment: waterEnvironment}), [isHeavy]))
  const falling = useDisposable(useMemo(() => new FountainWaterMaterial(true, isHeavy, {environment: waterEnvironment}), [isHeavy]))
  // Framed around the crown of the jet and the basin’s reach, circling at a bench’s distance at most.
  return <Orbitable
    id='lobby-fountain' center={[0, 2.5, 0]} name='lobby-fountain' orbit={{
      radius: 2.9,
      minDistance: 4.2,
      maxDistance: 11,
      floorY: fountain.position[1],
    }} position={fountain.position} title='Fountain'
  >
    <RigidBody colliders={false} type='fixed'>
      <MeshSurfaceCollider args={collision} />
      <mesh castShadow geometry={geometry.stone} material={stone} name='fountain-carved-stone' receiveShadow />
      <mesh castShadow geometry={geometry.gilt} material={gilt} name='fountain-gilt-bronze' receiveShadow />
    </RigidBody>
    <mesh geometry={geometry.pools} material={pool} name='fountain-pools' receiveShadow />
    <mesh geometry={geometry.water} material={falling} name='fountain-falling-water' />
    <primitive object={spray} />
    <primitive object={mist} />
  </Orbitable>
}

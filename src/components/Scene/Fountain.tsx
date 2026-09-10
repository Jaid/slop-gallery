import {RigidBody} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'
import {useGraphicsQuality} from 'use-graphics-quality'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {fountain} from '#src/lib/gallery/fountain/config.ts'
import {FountainGeometry} from '#src/lib/gallery/fountain/FountainGeometry.ts'
import {FountainSpray} from '#src/lib/gallery/fountain/FountainSpray.ts'
import {FountainWaterMaterial} from '#src/lib/materials/FountainWaterMaterial.ts'
import {LimestoneMaterial} from '#src/lib/materials/LimestoneMaterial.ts'

import MeshSurfaceCollider from './MeshSurfaceCollider.tsx'

export default function Fountain() {
  const isQuality = useGraphicsQuality()
  const geometry = useMemo(() => new FountainGeometry, [])
  const collision = useMemo(() => colliderGeometry(geometry.stone), [geometry])
  const stone = useMemo(() => new LimestoneMaterial, [])
  const brass = useMemo(() => new MeshStandardNodeMaterial({
    color: '#ba9650',
    roughness: 0.27,
    metalness: 0.85,
  }), [])
  const spray = useMemo(() => new FountainSpray, [])
  const water = useMemo(() => ({
    pool: new FountainWaterMaterial(false, isQuality),
    stream: new FountainWaterMaterial(true, isQuality),
  }), [isQuality])
  useEffect(() => () => {
    geometry.dispose()
    stone.dispose()
    brass.dispose()
    spray.dispose()
  }, [geometry, stone, brass, spray])
  useEffect(() => () => {
    water.pool.dispose()
    water.stream.dispose()
  }, [water])
  return <group name="daydream-fountain" position={fountain.position}>
    <RigidBody type="fixed" colliders={false}>
      <MeshSurfaceCollider args={collision}/>
      <mesh name="fountain-carved-stone" geometry={geometry.stone} material={stone} receiveShadow castShadow/>
      <mesh name="fountain-brass-inlay" geometry={geometry.brass} material={brass} receiveShadow castShadow/>
    </RigidBody>
    <mesh name="fountain-pools" geometry={geometry.pools} material={water.pool}/>
    <mesh name="fountain-cascades" geometry={geometry.streams} material={water.stream}/>
    <primitive object={spray}/>
    <pointLight position={[0, 0.85, 0]} color="#8edbce" intensity={4} distance={4}/>
  </group>
}

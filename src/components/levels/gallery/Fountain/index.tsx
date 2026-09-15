import {RigidBody} from '@react-three/rapier'
import {useEffect} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'
import useGraphicsQuality from 'use-graphics-quality'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import fountain from '#src/lib/gallery/fountain/config.ts'
import FountainGeometry from '#src/lib/gallery/fountain/FountainGeometry.ts'
import FountainSpray from '#src/lib/gallery/fountain/FountainSpray.ts'
import FountainWaterMaterial from '#src/lib/materials/FountainWaterMaterial.ts'
import LimestoneMaterial from '#src/lib/materials/LimestoneMaterial.ts'

export default function Fountain() {
  const isQuality = useGraphicsQuality()
  const geometry = new FountainGeometry
  const collision = colliderGeometry(geometry.stone)
  const stone = new LimestoneMaterial
  const brass = new MeshStandardNodeMaterial({
    color: '#ba9650',
    roughness: 0.27,
    metalness: 0.85,
  })
  const spray = new FountainSpray
  const water = {
    pool: new FountainWaterMaterial(false, isQuality),
    stream: new FountainWaterMaterial(true, isQuality),
  }
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
  return <group name='lobby-fountain' position={fountain.position}>
    <RigidBody colliders={false} type='fixed'>
      <MeshSurfaceCollider args={collision} />
      <mesh castShadow geometry={geometry.stone} material={stone} name='fountain-carved-stone' receiveShadow />
      <mesh castShadow geometry={geometry.brass} material={brass} name='fountain-brass-inlay' receiveShadow />
    </RigidBody>
    <mesh geometry={geometry.pools} material={water.pool} name='fountain-pools' />
    <mesh geometry={geometry.streams} material={water.stream} name='fountain-cascades' />
    <primitive object={spray} />
    <pointLight color='#8edbce' distance={4} intensity={4} position={[0, 0.85, 0]} />
  </group>
}

import {useEffect} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import EntranceGeometry from '#src/lib/gallery/EntranceGeometry.ts'
import LimestoneMaterial from '#src/lib/materials/LimestoneMaterial.ts'

export default function MainEntrance() {
  const geometry = new EntranceGeometry
  const stone = new LimestoneMaterial
  const wood = new MeshStandardNodeMaterial({
    color: '#33251e',
    roughness: 0.55,
  })
  const brass = new MeshStandardNodeMaterial({
    color: '#c3a062',
    roughness: 0.3,
    metalness: 0.85,
  })
  useEffect(() => () => {
    geometry.dispose()
    stone.dispose()
    wood.dispose()
    brass.dispose()
  }, [geometry, stone, wood, brass])
  // The existing solid north wall remains its collider: there is no unfinished exterior.
  return <group name='lobby-main-entrance' userData={{closed: true}}>
    <mesh castShadow geometry={geometry.leaves} material={wood} name='entrance-walnut-doors' receiveShadow />
    <mesh castShadow geometry={geometry.frame} material={stone} name='entrance-stone-surround' receiveShadow />
    <mesh castShadow geometry={geometry.metal} material={brass} name='entrance-bronze-details' receiveShadow />
    <mesh position={[0, 4.25, 0.31]}><torusGeometry args={[0.28, 0.018, 8, 48]} /><primitive attach='material' object={brass} /></mesh>
  </group>
}

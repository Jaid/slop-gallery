import {useEffect, useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import EntranceGeometry from '#src/lib/gallery/EntranceGeometry.ts'
import LimestoneMaterial from '#src/lib/materials/LimestoneMaterial.ts'

export default function MainEntrance() {
  const geometry = useMemo(() => new EntranceGeometry, [])
  const stone = useMemo(() => new LimestoneMaterial, [])
  const wood = useMemo(() => new MeshStandardNodeMaterial({
    color: '#33251e',
    roughness: 0.55,
  }), [])
  const brass = useMemo(() => new MeshStandardNodeMaterial({
    color: '#c3a062',
    roughness: 0.3,
    metalness: 0.85,
  }), [])
  useEffect(() => () => {
    geometry.dispose()
    stone.dispose()
    wood.dispose()
    brass.dispose()
  }, [geometry, stone, wood, brass])
  // The existing solid north wall remains its collider: there is no unfinished exterior.
  return <group name="lobby-main-entrance" userData={{closed: true}}>
    <mesh name="entrance-walnut-doors" geometry={geometry.leaves} material={wood} castShadow receiveShadow/>
    <mesh name="entrance-stone-surround" geometry={geometry.frame} material={stone} castShadow receiveShadow/>
    <mesh name="entrance-bronze-details" geometry={geometry.metal} material={brass} castShadow receiveShadow/>
    <mesh position={[0, 4.25, 0.31]}><torusGeometry args={[0.28, 0.018, 8, 48]}/><primitive object={brass} attach="material"/></mesh>
  </group>
}

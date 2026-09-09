import type {Vec3} from '#src/lib/gallery.ts'

import {RigidBody, TrimeshCollider} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'

import {PedestalGeometry} from '#src/lib/gallery/PedestalGeometry.ts'
import {LimestoneMaterial} from '#src/lib/materials/LimestoneMaterial.ts'

export function usePedestal() {
  const resources = useMemo(() => ({geometry: new PedestalGeometry, material: new LimestoneMaterial}), [])
  useEffect(() => () => {
    resources.geometry.dispose()
    resources.material.dispose()
  }, [resources])
  return resources
}

export default function Pedestal({position, geometry, material}: ReturnType<typeof usePedestal> & {position: Vec3}) {
  return <RigidBody type="fixed" colliders={false} position={position}>
    {geometry.collision.map((args, i) => <TrimeshCollider key={i} args={args}/>)}
    <mesh name="pedestal-stone" castShadow receiveShadow>
      <primitive object={geometry.stone} attach="geometry"/>
      <primitive object={material} attach="material"/>
    </mesh>
    <mesh name="pedestal-bronze" castShadow receiveShadow>
      <primitive object={geometry.bronze} attach="geometry"/>
      <meshStandardNodeMaterial color="#8c7044" metalness={0.78} roughness={0.38}/>
    </mesh>
    <mesh name="pedestal-reveals" castShadow receiveShadow>
      <primitive object={geometry.reveals} attach="geometry"/>
      <meshStandardNodeMaterial color="#514a3d" roughness={0.85}/>
    </mesh>
  </RigidBody>
}

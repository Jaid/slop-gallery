import type {Vec3} from '#src/lib/gallery.ts'

import {RigidBody, TrimeshCollider} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import PedestalGeometry from '#src/lib/gallery/PedestalGeometry.ts'
import LimestoneMaterial from '#src/lib/materials/LimestoneMaterial.ts'

export function usePedestal() {
  const geometry = useDisposable(useMemo(() => new PedestalGeometry, []))
  const material = useDisposable(useMemo(() => new LimestoneMaterial, []))
  return {
    geometry,
    material,
  }
}

export default function Pedestal({position, geometry, material}: ReturnType<typeof usePedestal> & {position: Vec3}) {
  return <RigidBody colliders={false} position={position} type='fixed'>
    {geometry.collision.map((args, i) => <TrimeshCollider key={i} args={args} />)}
    <mesh castShadow name='pedestal-stone' receiveShadow>
      <primitive attach='geometry' object={geometry.stone} />
      <primitive attach='material' object={material} />
    </mesh>
    <mesh castShadow name='pedestal-bronze' receiveShadow>
      <primitive attach='geometry' object={geometry.bronze} />
      <meshStandardNodeMaterial color='#8c7044' metalness={0.78} roughness={0.38} />
    </mesh>
    <mesh castShadow name='pedestal-reveals' receiveShadow>
      <primitive attach='geometry' object={geometry.reveals} />
      <meshStandardNodeMaterial color='#514a3d' roughness={0.85} />
    </mesh>
  </RigidBody>
}
